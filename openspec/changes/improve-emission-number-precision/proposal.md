## Why

Un usuario real reportó que la calculadora **no le cuadra la cuenta**: la grilla del paso 3 muestra un factor de `0,06`, él multiplica `21.600 × 0,06 = 1.296 kg = 1,3 t`, pero la app informa `1,23 t`. La app calcula bien — el factor real es `~0,057` y la UI **lo redondea a 2 decimales al mostrarlo**. El costo no es cosmético: un número que contradice su propio resultado destruye la credibilidad de todo el inventario ante un usuario que no tiene forma independiente de verificar el cálculo.

La causa es `formatNumeric` (`apps/web/src/utils/formatting.ts:168-185`), que aplica un máximo de **2 decimales** a todo valor con `|v| ≥ 0,01` — justo el rango donde viven casi todos los factores de combustión y electricidad, mientras la BD los guarda con 10 decimales (`Decimal(28,10)`). El mismo formateador genérico produce el segundo síntoma reportado: la tarjeta "Tu huella de carbono equivale" muestra `0,000057 tCO₂e/litros producidos` — un número de 6 decimales renderizado en `fontSize: 4rem`, ilegible, cuando lo que el usuario quiere leer es `57 gCO₂e/litros producidos`.

## What Changes

**Precisión y auditabilidad del factor**

- `formatter.emissionFactor()` apunta a **4 dígitos significativos, acotado por un piso de 2 decimales y un techo de 6**: `0,05694` · `2,68` · `0,000123` · `1.234,5`. El piso garantiza que **nunca** se muestre menos precisión que hoy, y por eso tiene precedencia sobre el objetivo de 4 significativos (un factor de `1164,4894` se muestra con 6 significativos: `1.164,49`). Los decimales se calculan a mano (`clamp(3 − floor(log10 |v|), 2, 6)`) y se pasan como `maximumFractionDigits`, en vez de depender de `roundingPriority` (Intl NumberFormat v3, ausente en WebViews viejos, donde degradaría en silencio).
- **Solo** cambia `emissionFactor()`. `formatNumeric` queda intacto para `emissions()` (tCO₂e es la unidad de reporte y comparación) y `quantity()` (cantidades que el propio usuario tipeó).
- **Valor sin redondeo bajo demanda**: el factor mostrado expone el valor **tal como lo entrega el API**, sin redondeo de display, con la etiqueta "Valor usado en el cálculo", en la celda de factor del paso 3 y en la tabla de factores del paso 4, y **solo cuando el redondeo esconde algo**: un factor de `0,177` ya se ve entero y un tooltip que repite la celda enseña a ignorar el affordance. El API convierte el decimal a número de doble precisión (`Decimal.toNumber()`), así que la garantía es "sin redondeo adicional", no fidelidad decimal exacta de la BD — para factores de la magnitud del producto ambas coinciden; el formateador se acota a los 10 decimales de la BD para no filtrar el ruido binario de un operando calculado. El affordance debe ser accesible (foco/tap), no solo hover de escritorio.
- **Cadena del cálculo** como tooltip de la celda de **emisiones**: `21.600 L × 0,056944 kg CO₂e/L = 1.229,9904 kg = 1,2299904 t`, con los cuatro números sin redondear — un operando redondeado haría que la cadena no multiplicara, que es justo lo que viene a resolver. Solo en líneas detalladas de la grilla del paso 3 — en modo total manual la grilla no está montada, y la tabla de líneas del paso 4 queda fuera. Deliberadamente un tooltip y no una fila desplegable: la grilla ya es densa y reusa el affordance del punto anterior. Es además la respuesta al límite del punto 1: con cantidades muy grandes el factor redondeado a 4 significativos ya no reproduce las emisiones informadas, y la cadena es el camino de auditoría.
- **Entrada de factores propios** hasta 10 decimales vía `FACTOR_INPUT_DECIMAL_SCALE`, solo en la celda de factor. La capacidad de entrada iguala lo que la BD preserva, para no truncar en silencio el dato del usuario. `INPUT_DECIMAL_SCALE` global **sigue en 4**: es el valor por defecto de los `NumericInput` decimales de la app, con las excepciones que ya existen (`FormNumericField` fuerza `0` con `onlyInteger`).
- **Excel**: el factor aparece en dos hojas con defectos distintos. En `Detalle emisiones` la celda **ya** es numérica, pero su `numFmt` (`#,##0.00`) la muestra con 2 decimales, replicando el problema dentro de la planilla → necesita formato de número propio. En `Factores utilizados` es un string preformateado → pasa a numérica, con la unidad de tasa en el formato de número de la celda (varía por fila, así que un encabezado único no puede transportarla). El formato se deriva de las constantes de la app y llega hasta los 10 decimales de la BD, porque la planilla no tiene el tooltip de valor exacto que compensa el techo de la grilla. Cambia el contrato del test de export.

**Unidad adaptativa de la intensidad**

- Nuevo método del `Formatter` que devuelve `{ value, unit }` eligiendo la unidad de masa para que el número caiga en `[1, 1000)`: `≥1 t → tCO₂e`; `≥1 kg → kgCO₂e`; resto → `gCO₂e`. Máximo 2 decimales sin ceros de relleno; piso `<0,01 gCO₂e` comparado contra el valor crudo (si se comparara después de redondear, `0,0075 g` treparía a un `0,01 g` presentable); etiquetas con la ortografía del resto de la app, sin espacio entre masa y gas; promoción a la unidad mayor si el redondeo lleva el número a `1000` (`0,999999 t` debe dar `1 t`, no `1.000 kg`). El rango es objetivo y no garantía: por encima de `1000 t` no hay unidad mayor. Umbrales como constantes nombradas.
- Se aplica **solo** a los dos consumidores del `rate` de equivalencia: la tarjeta `EmissionEquivalenceCard` (paso 5 y `HomeScreen`) y el caption de `TotalEmissionsBar` (paso 4). Totales del inventario, rankings y portal de transparencia **siguen en tCO₂e** para no romper la comparabilidad entre inventarios.
- `formatter.rate()` queda sin consumidores tras este cambio y se elimina.

**Fuera de alcance (decidido explícitamente)**

- El plural de `activityName` (`gCO₂e/litros producidos` chirría). El arreglo correcto exige una etiqueta singular que la BD no tiene hoy; se registra como issue de datos sobre `OrganizationMainActivity`, sin heurísticas de string en el front.
- Escala adaptativa en totales, rankings y transparencia.
- El botón "Guardar avance" del paso 3 y la fila vacía fantasma al agregar subcategorías (mismo lote de feedback) — van en un change separado porque requieren repro en la app corriendo y tocan el flujo de captura.

## Capabilities

### New Capabilities

- `emission-factor-precision`: Cómo se muestra, se ingresa y se audita un factor de emisión en la UI — precisión de display por dígitos significativos con piso de no-regresión, exposición del valor exacto almacenado, cadena de cálculo verificable, precisión de entrada de factores propios alineada a la BD, y el factor como número en el export a Excel.
- `emission-intensity-units`: Cómo se presenta la intensidad de emisiones por unidad de actividad principal — selección adaptativa de la unidad de masa (t/kg/g) según magnitud, precisión por tramo, piso para valores ínfimos, y el alcance acotado a la equivalencia (no a totales comparables).

### Modified Capabilities

<!-- Ninguna. Ningún spec existente en openspec/specs/ cubre el formateo numérico de la UI; este change lo introduce. -->

## Impact

- **Formateador** (`apps/web/src/utils/formatting.ts`): `emissionFactor()` con lógica propia de dígitos significativos; nuevo método de intensidad adaptativa devolviendo `{ value, unit }`; `rate()` eliminado. `formatNumeric` sin cambios.
- **Constantes** (`apps/web/src/config/constants.ts`): `FACTOR_INPUT_DECIMAL_SCALE`, umbrales de la escala adaptativa y dígitos significativos del factor como constantes nombradas y documentadas, incluida la nota de por qué conviven dos escalas de entrada.
- **Paso 3** (`apps/web/src/screens/CarbonInventory/components/EmissionEditor/cells/`): `EmissionEditorFactorCell` (display de 4 dígitos significativos, `decimalScale` propio en el input editable, affordance de valor exacto) y `EmissionEditorEmissionsCell` (tooltip de cadena de cálculo, solo líneas detalladas).
- **Paso 4** (`apps/web/src/screens/CarbonInventory/components/EmissionSummary/`): `useEmissionFactorsColumns` (affordance de valor sin redondeo en el factor principal; sus líneas de desglose por gas heredan la precisión pero **no** el affordance), `useSubcategoryLinesColumns`, `TotalEmissionsBar` (unidad adaptativa en el caption).
- **Paso 5 y Home** (`apps/web/src/components/EmissionResults/`): `EmissionResultsContent` pasa `{ value, unit }` a `EmissionEquivalenceCard`; la tarjeta se renderiza en `EmissionResultsScreen` y en `HomeScreen`, así que el cambio se ve en los dos.
- **Export** (`apps/web/src/utils/exportCarbonInventoryToExcel.ts`): celda de factor numérica; `exportCarbonInventoryToExcel.test.ts` actualiza sus aserciones.
- **Tests** (`apps/web/src/utils/formatting.test.ts`): tests de tabla para los cuatro tramos del factor y para cada tramo de la escala adaptativa, incluidos los bordes de umbral y el piso.
- **API**: sin cambios. `getMainActivityEquivalence` ya devuelve `rate` crudo con precisión completa, y los factores ya viajan con la precisión de la BD.
- **Sin migración, sin cambios de schema, sin cambios de contrato de API.** Front puro.
