## Context

La presentación numérica de las pantallas de inventario pasa por una única clase `Formatter` (`apps/web/src/utils/formatting.ts`), instanciada una vez con la localización de la app (existen focos aislados fuera de ella —el `Intl.NumberFormat` propio del chatbot, los `toFixed` de modales del mantenedor— que este change no toca). Sus cuatro métodos numéricos públicos — `emissions()`, `quantity()`, `rate()`, `emissionFactor()` — delegan en el mismo privado `formatNumeric` (`:168-185`), cuya regla es:

```
|v| = 0        → "0"
|v| < 10⁻⁶     → "<0,000001"        (etiqueta de umbral)
|v| < 0,01     → hasta 6 decimales  (rama adaptativa)
|v| ≥ 0,01     → MÁXIMO 2 DECIMALES ← el bug reportado vive acá
```

Esa última rama es correcta para toneladas y cantidades, y equivocada para factores: el rango `0,01–1` es justo donde viven los factores de combustión y electricidad, así que un factor de `0,056944` se muestra como `0,06`. La BD los guarda con `Decimal(28,10)` y el API los entrega con precisión completa — la pérdida es **solo de display**.

El mismo `formatNumeric` genérico produce el segundo síntoma: `formatter.rate()` formatea la tasa de equivalencia (tCO₂e por unidad de actividad principal), que para una organización con producción alta y huella baja da `0,000057`, renderizado en la tarjeta con `fontSize: 4rem`.

Restricciones que condicionan el diseño:

- `formatNumeric` es compartido por cuatro métodos; cambiarlo alcanza emisiones, rankings, portal de transparencia y export a Excel de una sola vez.
- `INPUT_DECIMAL_SCALE = 4` es el valor por defecto de **todos** los `NumericInput` decimales de la app, no solo de los factores (con excepciones ya existentes: `FormNumericField` fuerza `0` cuando `onlyInteger` está activo).
- El API entrega los factores como número de doble precisión (`Decimal.toNumber()` en los servicios, `z.number()` en los contratos), no como decimal canónico: cualquier garantía de precisión del front es relativa a lo que el API entregó, no a la columna `Decimal(28,10)`.
- La tarjeta de equivalencia renderiza número y unidad en dos `Typography` distintos, y se monta en dos pantallas (paso 5 y `HomeScreen`).
- `apps/web` ya tiene Vitest con `formatting.test.ts`, así que las reglas numéricas son verificables por tests de tabla sin infraestructura nueva.

## Goals / Non-Goals

**Goals:**

- Que la multiplicación que el usuario hace a mano con el factor **mostrado** cierre contra las emisiones que la app informa.
- Que el valor exacto almacenado sea consultable sin salir de la pantalla, para el usuario que quiere auditar.
- Que la intensidad por unidad de actividad se lea siempre como un número corto con unidad adecuada.
- Cambiar el mínimo posible de superficie: ningún valor puede quedar con **menos** precisión que hoy, y nada fuera del factor y de la equivalencia debe cambiar de formato.

**Non-Goals:**

- Cambiar la unidad de reporte del producto: emisiones, totales, rankings y transparencia siguen en tCO₂e.
- Cambiar `formatNumeric` y por lo tanto `emissions()` y `quantity()`.
- Corregir el plural de `activityName` (requiere un dato que la BD no tiene).
- El botón "Guardar avance" y la fila vacía fantasma del paso 3 (change separado).
- Cualquier cambio de API, schema o migración.

## Decisions

### 1. Dígitos significativos con piso de 2 decimales, calculados a mano

`emissionFactor()` deja de usar `formatNumeric` y calcula sus propios `maximumFractionDigits`: `clamp(3 − floor(log10(|v|)), 2, 6)`, con `minimumFractionDigits: 0`.

- **Por qué el piso de 2**: es la garantía de no-regresión. Sin él, 4 dígitos significativos convertirían `1234,5` en `1235` — hoy se ve `1.234,5`. Con el piso, ningún valor pierde precisión respecto del estado actual.
- **Por qué el techo de 6**: preserva la etiqueta `<0,000001` que ya existe para valores ínfimos, en vez de mostrarlos como `0,000000`.
- **"4 dígitos significativos" es el objetivo, no una invariante.** El piso y el techo lo sobrescriben en los extremos y eso es deliberado: un factor real de los seeds como `1164,4894` se muestra con 6 significativos (`1.164,49`) por el piso, y `0,00000149` con uno solo (`0,000001`) por el techo. El spec lo enuncia con esa jerarquía explícita para que nadie lo "corrija" después rompiendo la no-regresión.
- **El orden de las guardas es normativo**: vacío/`NaN` → `0` → umbral (`0 < |v| < 10⁻⁶`) → magnitud. Si el umbral se evaluara después del formateo, `0,0000005` se mostraría como `0,000001` y `10⁻⁷` como `0`, perdiendo la etiqueta; y si el cero no se atajara primero, `log10(0) = -Infinity` rompería el clamp.
- **Límite conocido y aceptado**: con cantidades muy grandes, el factor redondeado a 4 significativos ya no reproduce las emisiones informadas (cantidad `10.000.000` × `0,05694` = `569,40 t` vs `569,44 t` reales). No se corrige variando la precisión por fila según la cantidad — una columna donde cada fila tiene otra precisión es peor que el problema. El camino de auditoría para ese caso es el valor sin redondear y la cadena de cálculo, y el spec lo dice como escenario en vez de prometer una igualdad que no se sostiene.
- **Por qué cálculo manual y no `maximumSignificantDigits` + `roundingPriority`**: la combinación de dígitos significativos con un piso de decimales requiere `roundingPriority` (Intl NumberFormat v3). Donde no exista, el navegador ignora la opción y degrada la precisión **en silencio** — el mismo fallo que estamos arreglando, pero intermitente por dispositivo. Aritmética propia = comportamiento idéntico en todas partes.
- **Alternativas descartadas**: dejar 2 decimales (es el bug); 4 decimales fijos (produce `2,6800` y trunca `0,000123` a `0,0001`); 5 dígitos significativos (un dígito más de ruido en una grilla densa sin mejorar la verificación manual, que ya cierra con 4); delegar la precisión al tooltip y no tocar el display (el usuario que no descubre el tooltip sigue viendo un número que no cuadra).

### 2. Solo `emissionFactor()` cambia; `rate()` se elimina

`formatNumeric` queda intacto. `rate()` se borra en vez de migrarse: sus **únicos** dos consumidores (`EmissionResultsContent.tsx:110` y `TotalEmissionsBar.tsx:57`) son exactamente los dos que pasan al formateador de intensidad adaptativa, así que adaptarlo sería trabajo muerto. Antes de borrarlo hay que confirmar por búsqueda que no quedó ningún consumidor.

- **Alternativa descartada**: cambiar `formatNumeric` para todos. Radio de impacto: emisiones de todas las pantallas, rankings, portal público de transparencia y export a Excel, por un reporte que es sobre factores. Riesgo desproporcionado.

### 3. El valor exacto y la cadena del cálculo van como affordance bajo demanda, no como UI permanente

Ambos se exponen sobre elementos que ya existen (celda de factor, celda de emisiones) en vez de agregar columnas o filas desplegables. La grilla del paso 3 ya es densa — dimensiones, unidad, fuente del factor, factor, cantidad, emisiones, acciones — y la convención del repo para "detalle que no todos necesitan" es el tooltip.

La cadena `cantidad × factor = kg = t` se pone en la celda de **emisiones**, no en la de factor: es donde el usuario mira cuando el número no le cuadra. Se muestra solo en líneas detalladas computables; en modo total manual no existe cadena que mostrar, y una cadena inventada sería peor que ninguna.

- **Alternativa descartada**: fila desplegable por línea con el detalle del cálculo. Más superficie de UI, más estados, y casos donde la fórmula simple no representa fielmente el cálculo real.
- **Requisito no negociable**: el affordance debe responder a foco y a toque. Un tooltip solo-hover deja sin auditoría a quien use tablet.

Correcciones tomadas en revisión, las dos sobre el mismo principio (un affordance de auditoría que miente es peor que no tenerlo):

- **El affordance de valor exacto solo aparece cuando el redondeo esconde algo.** La primera implementación lo ponía en toda celda no editable, así que un factor de `0,177` abría un tooltip que repetía la celda. Un affordance que la mitad de las veces no aporta es un affordance que se deja de mirar.
- **Los cuatro números de la cadena van sin redondear, no solo el factor.** Con la cantidad formateada por `quantity()`, una línea de `0,12345 L` mostraba `0,12 × 0,056944 = 0,00703`: una cadena que no multiplica, en el tooltip cuya única razón de existir es que multiplique. El formateador sin redondeo pasa a ser genérico (`exact()`) y se acota a los 10 decimales de la BD en vez de a los 20 de `Intl`, porque los operandos calculados son productos de dobles y `10.000 × 0,177 / 1000` se renderiza `1,7700000000000002` con 20.

### 4. Escala de entrada del factor propio = 10, igual que la BD; la global sigue en 4

Constante nombrada `FACTOR_INPUT_DECIMAL_SCALE = 10`, pasada como `decimalScale` únicamente al `NumericInput` de la celda de factor (la prop ya existe y por defecto toma `formatter.decimalScale`).

El principio: **la capacidad de entrada debe igualar la precisión que la BD preserva**. Con 4, un usuario que pega un factor oficial de 6 decimales lo ve truncado sin aviso. `Decimal(28,10)` acepta 10, así que 10.

- **Alternativa descartada**: subir `INPUT_DECIMAL_SCALE` global a 6 o 10. Afecta cantidades, escenarios de proyectos de reducción y todo formulario numérico de la app, sin que nadie lo haya pedido.
- **Alternativa descartada**: 6 decimales en el factor. Elegido arbitrariamente respecto de lo que la BD guarda; vuelve a truncar en silencio, solo más tarde.
- **Deuda aceptada**: dos escalas de entrada conviviendo. Se documenta en el comentario de ambas constantes, explicando por qué difieren.

### 5. La intensidad adaptativa es un método del `Formatter` que devuelve `{ value, unit }`

Vive en la clase `Formatter` y no como helper suelto: necesita la localización, los separadores y el placeholder vacío que la clase ya resuelve, y así los dos consumidores no pueden divergir. No va a `packages/utils` porque el API no formatea: `getMainActivityEquivalence` devuelve `rate` crudo con precisión completa, que es lo correcto.

Devuelve `{ value, unit }` y **no** un string armado, por dos razones: la tarjeta estiliza número y unidad en dos `Typography` distintos (el número en tamaño hero), y cada consumidor compone el sufijo de actividad a su manera. `unit` es solo la unidad de masa; `/${activityName}` lo pega el call site.

La unidad se elige **sobre el valor crudo, antes de redondear**, y luego se verifica el resultado: si el número redondeado alcanza `1000` y existe una unidad mayor, se promueve. Sin ese segundo paso, `0,999999 t` se selecciona correctamente como kilogramos y termina mostrado como `1.000 kg` en vez de `1 t`. El rango `[1, 1000)` es entonces un objetivo con dos excepciones honestas: no hay unidad mayor que la tonelada (`1200 t` se muestra tal cual) y el piso de gramos corta abajo.

El piso de gramos, en cambio, se compara **contra el valor crudo**, no contra el redondeado: la primera implementación preguntaba si el valor redondeado daba cero, así que `0,0075 g` trepaba a un `0,01 g` presentable y la tarjeta afirmaba una precisión que la tasa no alcanza. Es el mismo orden normativo que ya tiene la etiqueta de umbral del factor — corregido en revisión.

Las etiquetas usan la ortografía del resto de la app, sin espacio entre masa y gas (`tCO₂e`, `kgCO₂e`, `gCO₂e`). La primera implementación las escribía separadas y en el paso 4 quedaba el total en `1,77 tCO₂e` justo encima de la equivalencia en `1,23 t CO₂e/x`: dos ortografías de la misma unidad en una pantalla se leen como dos unidades distintas.

- **Alternativa descartada**: helper standalone en `apps/web/src/utils`. Duplicaría el acceso a localización y separadores que la clase ya tiene.
- **Alternativa descartada**: devolver el string completo. Rompe el layout de la tarjeta y habilita que los dos consumidores se desincronicen con el tiempo.

### 6. La escala adaptativa NO se extiende a los totales

Solo la equivalencia. Un total de `0,004` tCO₂e seguirá leyéndose raro, y es aceptable: los totales se comparan entre inventarios (rankings, transparencia, tarjetas de listado) y una unidad que varía por fila destruye la comparabilidad visual. La equivalencia es un cociente cuya magnitud depende de la escala de producción de cada organización, así que ahí la unidad fija es la que falla.

Mitigación de la inconsistencia resultante (total en toneladas, equivalencia en gramos): la unidad se renderiza siempre pegada al valor, nunca suelta ni implícita en un encabezado.

### 7. El Excel tiene dos defectos distintos, uno por hoja

- **`Detalle emisiones`** ya escribe `line.factorValue` como número (col. 7), pero le aplica el mismo `numFmt = "#,##0.00"` que a cantidades y emisiones (`exportCarbonInventoryToExcel.ts:9,134-136`). El valor sirve para una fórmula, pero **se ve** con 2 decimales: el problema del reporte, reproducido dentro de la planilla. Necesita un formato de número propio para la columna del factor, sin tocar el de cantidad ni el de emisiones.
- **`Factores utilizados`** sí concatena factor redondeado + unidad en un string (`:162-168`). Pasa a numérica, con la unidad de tasa en el **formato de número de la celda** (`#,##0.00########" kg CO₂e/L"`).

  Corrección tomada durante la implementación: la decisión original era llevar la unidad al encabezado de la columna, pero `rateUnit` **varía por fila** (`kg CO₂e/L`, `kg CO₂e/kWh`), así que un encabezado único no puede transportarla y la celda numérica pelada perdería el denominador. El formato de número por celda cumple los tres objetivos a la vez: el valor sigue siendo un número que una fórmula puede multiplicar, la unidad se ve pegada al número, y la hoja no gana una sexta columna.

  Segunda corrección, tomada en revisión: el formato se **deriva** de las constantes de precisión de la app en vez de repetirlas como literal (si no, subir el techo de display dejaría el export atrás sin que ningún test avise), y su techo es la escala de la BD (10) y no el techo de display (6). La grilla se acota a 6 porque es densa y compensa con el tooltip de valor exacto; la planilla no tiene tooltip, así que un factor propio de 10 decimales volvería a verse recortado — el defecto de origen, una capa más abajo.

El test de export existente cambia de aserción en este mismo change.

### 8. El plural de `activityName` queda fuera

`"g CO₂e/litros producidos"` sigue chirriando. La barra ya se lee como "por" y la frase se entiende; cualquier singularización por heurística de string fallará con nombres reales cargados por el mantenedor. El arreglo correcto es un dato nuevo (etiqueta singular o unidad en `OrganizationMainActivity`) y se registra como issue aparte.

## Risks / Trade-offs

- **Más dígitos en una grilla ya densa** → el techo de 6 decimales y el piso de 2 acotan el ancho; los factores reales caen en 4-5 caracteres útiles. La precisión completa vive en el affordance, no en la celda.
- **`0,06` se vuelve `0,05694` para usuarios que ya conocían la pantalla** → es display-only, ningún dato almacenado cambia, y la dirección del cambio es siempre "más precisión, nunca menos". Vale mencionarlo en la comunicación del release.
- **Dos escalas de entrada conviviendo (4 global / 10 factor)** → comentario explícito en ambas constantes; sin él, el próximo que toque el tema unificará por el lado equivocado.
- **La unidad de la equivalencia varía entre inventarios** → unidad siempre adyacente al valor; totales y rankings intactos, así que ninguna comparación entre organizaciones cambia de unidad.
- **Borrar `rate()` puede romper un consumidor no detectado** → búsqueda exhaustiva antes de eliminar; el type-check del monorepo lo confirma.
- **El affordance de valor exacto puede ser inaccesible en táctil si se implementa como tooltip solo-hover** → está como requisito normativo en el spec, no como detalle de implementación.
- **La celda numérica del Excel cambia el contrato del test existente** → la actualización de `exportCarbonInventoryToExcel.test.ts` es parte del alcance, no un efecto colateral a descubrir en CI.
- **Bordes de umbral en la escala adaptativa** (`1 t`, `1 kg`, piso de `0,01 g`, cero) → cubiertos con tests de tabla explícitos por tramo y por borde.

## Migration Plan

Front puro: sin migración de datos, sin cambios de schema, sin cambios de contrato de API. Se envía como un PR único.

Verificación antes de mergear: `pnpm format && pnpm lint && pnpm type-check` + `pnpm test:web`, más una pasada manual con un inventario cuyo factor tenga ≥4 decimales, confirmando en paso 3 que `cantidad × factor mostrado` cierra contra la columna de emisiones, y en paso 4/5 que la equivalencia elige la unidad esperada.

Rollback: revertir el PR. No hay estado persistido que quede inconsistente.

## Open Questions

- Copy exacto de la etiqueta del valor sin redondear ("Valor usado en el cálculo") y de la cadena de cálculo. Único punto abierto; no bloquea la implementación.

**Resueltas** (estaban abiertas y las tareas dependían de ellas):

- La cadena de cálculo va **solo en la grilla del paso 3**. La tabla de líneas por subcategoría del paso 4 queda fuera: es una vista de lectura ya resumida y duplicar el affordance ahí no agrega auditoría.
- En el Excel la unidad de tasa **no** va en una columna propia: evita una columna más en una hoja que ya tiene cinco y mantiene la celda del factor operable. Viaja en el formato de número de la celda (ver la decisión 7; la variante "en el encabezado" se descartó al implementar porque la unidad varía por fila).
- El desglose por gas de la tabla de factores **hereda la nueva precisión pero no gana affordance** de valor sin redondear: sus valores vienen de un JSON ya convertido y no son el número que el usuario intenta reconciliar.
