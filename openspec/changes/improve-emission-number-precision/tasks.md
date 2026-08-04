## 1. Constantes de precisión

- [x] 1.1 Agregar `FACTOR_DISPLAY_SIGNIFICANT_DIGITS = 4`, `FACTOR_DISPLAY_MIN_DECIMALS = 2` y `FACTOR_DISPLAY_MAX_DECIMALS = 6` en `apps/web/src/config/constants.ts`, con comentario explicando que el piso existe como garantía de no-regresión frente al formato anterior de 2 decimales
- [x] 1.2 Agregar `FACTOR_INPUT_DECIMAL_SCALE = 10` en el mismo archivo, con comentario explicando que iguala la precisión de `Decimal(28,10)` y por qué difiere de `INPUT_DECIMAL_SCALE`
- [x] 1.3 Ampliar el comentario de `INPUT_DECIMAL_SCALE` para dejar claro que es la escala global de todos los `NumericInput` **excepto** la celda de factor
- [x] 1.4 Agregar los umbrales de la escala adaptativa de masa como constantes nombradas (`INTENSITY_TON_THRESHOLD_T = 1`, `INTENSITY_KG_THRESHOLD_T = 0.001`, `INTENSITY_MAX_DECIMALS = 2`, piso de gramos)

## 2. Formateador

- [x] 2.1 Reescribir `Formatter.emissionFactor()` en `apps/web/src/utils/formatting.ts` (`formatNumeric` vive en `:168-185` y NO se toca) con las guardas en este orden normativo: vacío/`NaN` → `value === 0` → umbral `0 < |v| < 10⁻⁶` → `maximumFractionDigits = clamp(3 − floor(log10(|v|)), MIN, MAX)` con `minimumFractionDigits: 0`
- [x] 2.2 Verificar explícitamente los dos motivos del orden: el cero atajado antes evita `log10(0) = -Infinity`, y el umbral antes del formateo evita que `0,0000005` se muestre como `0,000001`
- [x] 2.3 Verificar que `formatNumeric`, `emissions()` y `quantity()` quedan sin modificar
- [x] 2.4 Agregar el método de intensidad adaptativa que recibe la tasa en tCO₂e/unidad y devuelve `{ value, unit }`, eligiendo la unidad **sobre el valor crudo antes de redondear** (`≥1 t → t CO₂e`, `≥0,001 t → kg CO₂e`, resto → `g CO₂e`), con máximo 2 decimales sin ceros de relleno
- [x] 2.5 Implementar la promoción post-redondeo: si el número formateado alcanza `1000` y existe unidad mayor, subir de unidad y reformatear (`0,999999 t` → `1 t`, no `1.000 kg`). Por encima de `1000 t` no hay promoción posible: se muestra en toneladas con separador de miles
- [x] 2.6 Implementar el piso `<0,01 g CO₂e` para tasas positivas ínfimas y el caso `0 → "0" + "g CO₂e"`
- [x] 2.7 Agregar el acceso al factor **sin redondeo de display** (el valor tal como lo entrega el API, que es un `number` por el `Decimal.toNumber()` del servicio) para alimentar el affordance de valor exacto y la cadena de cálculo

## 3. Tests del formateador

- [x] 3.1 En `apps/web/src/utils/formatting.test.ts`, **partir el test existente** `"rate / emissionFactor delegate to the same numeric formatting"` (`:114-124`): sus aserciones de `rate()` se eliminan junto con el método (grupo 9) y las de `emissionFactor()` pasan al nuevo bloque — verificando que `1000000 → "1.000.000"` y `0,001 → "0,001"` siguen dando lo mismo con la fórmula nueva
- [x] 3.2 Test de tabla de `emissionFactor()` con los cuatro tramos: `0,056944 → 0,05694`, `2,68 → 2,68`, `1234,5 → 1.234,5`, `0,000123 → 0,000123`
- [x] 3.3 Tests de precedencia del piso y del techo sobre los 4 significativos: `1164,4894 → 1.164,49` (valor real de los seeds) y `0,00000149 → 0,000001`
- [x] 3.4 Tests de las guardas y su orden: `0 → "0"` (no etiqueta de umbral), `0,0000005 → "<0,000001"`, `10⁻⁷ → "<0,000001"`, negativo → `">-0,000001"`, `null`/`undefined`/`NaN` → placeholder e `ifEmpty`
- [x] 3.5 Test de no-regresión: para un conjunto de valores representativos, la cantidad de decimales mostrada nunca es menor que la que producía el formato anterior
- [x] 3.6 Test del caso reportado: con cantidad `21600` y factor `0,056944`, el producto del factor **mostrado** por la cantidad, convertido a toneladas y formateado con `emissions()`, da el mismo string que las emisiones informadas (`1,23 t`)
- [x] 3.7 Test del límite conocido: con cantidad `10000000` el factor mostrado ya NO reproduce las emisiones informadas — documentar la divergencia esperada en el test, para que quede como comportamiento conocido y no como sorpresa futura
- [x] 3.8 Test de tabla de la intensidad adaptativa por tramo: `1,23 → 1,23 t CO₂e`, `0,00425 → 4,25 kg CO₂e`, `0,0000569444 → 56,94 g CO₂e`, `0,000057 → 57 g CO₂e`
- [x] 3.9 Tests de borde de la intensidad: exactamente `1` t, exactamente `0,001` t, promoción por redondeo (`0,000999999 → 1 kg CO₂e` y `0,999999 → 1 t CO₂e`), `1200 → 1.200 t CO₂e`, tasa bajo el piso → `<0,01 g CO₂e`, `0 → 0 g CO₂e`, sin ceros de relleno
- [x] 3.10 Tests de que `emissions()` y `quantity()` conservan su salida previa (protegen el límite del cambio)

## 4. Paso 3 — celda de factor

- [x] 4.1 En `EmissionEditorFactorCell.tsx`, pasar `decimalScale={FACTOR_INPUT_DECIMAL_SCALE}` al `NumericInput` del factor editable (factor propio), sin tocar los demás `NumericInput` de la grilla
- [x] 4.2 Agregar el affordance de valor exacto sobre el factor mostrado (rama no editable) con la etiqueta acordada, usando el valor almacenado sin redondear
- [x] 4.3 Hacer el affordance accesible por foco y por toque, no solo por `hover`
- [x] 4.4 Verificar que el tooltip de razón de deshabilitado existente (`validation.factorValueDisabledReason`) sigue funcionando y no compite con el nuevo affordance
- [x] 4.5 Verificar el round-trip de un factor propio de 10 decimales (`0,0569441234`): ingresar → guardar → recargar la pantalla → el valor vuelve completo. Cubre input, `mapLinesToSyncRequest`, el `z.number()` del contrato, la persistencia en `Decimal(28,10)` y el `Decimal.toNumber()` de vuelta

## 5. Paso 3 — celda de emisiones

- [x] 5.1 En `EmissionEditorEmissionsCell.tsx`, agregar el affordance con la cadena `cantidad + unidad × factor sin redondear + unidad de tasa = kg = t`, leyendo también la unidad de medida y la unidad de tasa de la línea
- [x] 5.2 No mostrar cadena cuando la línea está en modo total manual, ni cuando falta cantidad o falta factor
- [x] 5.3 Verificar que la celda sigue reaccionando a cambios de cantidad y factor sin re-render de toda la grilla (los `useWatch` actuales ya son por campo)

## 6. Paso 4 — resumen

- [x] 6.1 En `useEmissionFactorsColumns.tsx`, agregar el affordance de valor sin redondeo sobre el **factor principal** (`:85`). Las líneas de desglose por gas (`:94`) heredan la nueva precisión de display pero NO llevan affordance — decisión explícita del design
- [x] 6.2 Revisar `useSubcategoryLinesColumns.tsx`: el factor ya usa `formatter.emissionFactor()` y hereda la nueva precisión; confirmar que el ancho de columna y el header "Factor kgCO₂e/unidad" siguen legibles
- [x] 6.3 En `TotalEmissionsBar.tsx`, reemplazar `formatter.rate(...) + "tCO₂e/"` por el método de intensidad adaptativa, componiendo `{value} {unit}/{activityName}` en el caption

## 7. Paso 5 y Home — tarjeta de equivalencia

- [x] 7.1 En `EmissionResultsContent.tsx`, reemplazar `formatter.rate(equivalence.rate)` y la unidad hardcodeada `` `tCO₂e/${activityName}` `` por el resultado del método adaptativo, pasando `value` y `` `${unit}/${activityName}` `` a la tarjeta
- [x] 7.2 Verificar la tarjeta en las dos ubicaciones donde se monta (`EmissionResultsScreen` y `HomeScreen`) con un valor de cada tramo (t, kg, g), incluido el comportamiento de `OverflowTooltipText` en la tipografía hero — verificado en `EmissionResultsScreen` con los tres tramos (t/kg/g) sin recorte de `OverflowTooltipText`; `HomeScreen` monta el mismo `EmissionResultsContent` con las mismas props pero exige onboarding completo (organización inscrita + huella autodeclarada), así que ahí queda cubierto por identidad de componente, no por inspección visual
- [x] 7.3 Confirmar que el estado vacío de la tarjeta (sin actividad principal declarada) sigue intacto

## 8. Export a Excel

- [x] 8.1 Hoja `Detalle emisiones`: la celda del factor (col. 7) ya es numérica, pero comparte `numFmt = "#,##0.00"` con cantidad y emisiones (`:9,134-136`) y por eso **se ve** con 2 decimales. Darle a la columna 7 un formato de número propio con decimales suficientes, sin tocar el de las columnas 6 y 9
- [x] 8.2 Hoja `Factores utilizados`: reemplazar el string `` `${formatter.emissionFactor(...)} ${rateUnit}` `` (`:162-168`) por el valor numérico, con su propio `numFmt`
- [x] 8.3 Mover la unidad de tasa al encabezado de esa columna (decisión resuelta en el design), sin agregar una columna nueva
- [x] 8.4 Actualizar las aserciones de `exportCarbonInventoryToExcel.test.ts` que hoy comparan contra `formatter.emissionFactor(...)` (hay al menos dos, para `kWh` y para `L`)
- [x] 8.5 Abrir el archivo exportado y confirmar en las dos hojas que el factor se ve con sus decimales y que una fórmula de la planilla puede multiplicarlo

## 9. Limpieza

- [x] 9.1 Buscar en todo `apps/web` consumidores de `formatter.rate(` y confirmar que quedan cero tras los pasos 6 y 7 (hoy son exactamente dos: `EmissionResultsContent.tsx:110` y `TotalEmissionsBar.tsx:57`)
- [x] 9.2 Eliminar el método `rate()` de la clase `Formatter`
- [x] 9.3 Eliminar del test las aserciones de `rate()` que quedaron huérfanas al partir el bloque en la tarea 3.1
- [x] 9.4 Confirmar por type-check que no quedó ninguna referencia

## 10. Verificación y entrega

- [x] 10.1 `pnpm format && pnpm lint && pnpm type-check`
- [x] 10.2 `pnpm test:web` (incluye el piso de coverage)
- [x] 10.3 Pasada manual en la app con un inventario cuyo factor tenga ≥4 decimales: en paso 3, `cantidad × factor mostrado` cierra contra la columna de emisiones; el valor exacto y la cadena de cálculo se abren con teclado y con toque
- [x] 10.4 Pasada manual de la equivalencia en los tres tramos (t, kg, g) verificando que la tarjeta del paso 5 y el caption del paso 4 muestran la misma unidad para el mismo inventario
- [x] 10.5 Commits modulares en orden: constantes + formateador + tests → paso 3 → paso 4 → paso 5/Home → Excel → limpieza
- [x] 10.6 PR con título en inglés en formato Conventional Commits y descripción que mencione explícitamente que los números mostrados cambian (más precisión, nunca menos) y que no hay cambios de datos

## 11. Seguimiento

- [x] 11.1 Abrir issue de datos: `OrganizationMainActivity` necesita etiqueta singular o unidad propia para que la equivalencia pueda decir "por litro producido" en vez de "/litros producidos" → https://github.com/undp/carbon-footprint-program/issues/583
- [x] 11.2 Registrar en el issue que la escala adaptativa quedó deliberadamente fuera de totales, rankings y transparencia, con el motivo (comparabilidad)
