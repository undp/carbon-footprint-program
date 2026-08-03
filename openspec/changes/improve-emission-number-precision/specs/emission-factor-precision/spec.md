## ADDED Requirements

### Requirement: El factor de emisión apunta a 4 dígitos significativos, acotado por un piso de 2 y un techo de 6 decimales

El formateador de factores de emisión SHALL evaluar sus reglas en este orden, y el orden MUST respetarse porque cada guarda protege un caso que la siguiente rompería:

1. Valor `null`, `undefined` o `NaN` → placeholder vacío configurado (o el `ifEmpty` recibido).
2. Valor exactamente `0` → `0`.
3. Valor **no cero** cuyo módulo sea menor que `10⁻⁶` → etiqueta de umbral (`<0,000001` para positivos, `>-0,000001` para negativos).
4. Resto → `maximumFractionDigits = clamp(3 − floor(log10(|v|)), 2, 6)` con `minimumFractionDigits: 0`.

El objetivo son 4 dígitos significativos, pero **el piso y el techo tienen precedencia sobre ese objetivo**, deliberadamente:

- **Piso de 2 decimales**: garantía de no-regresión. Ningún valor puede mostrarse con menos precisión que antes de este change. Como efecto, los valores `≥ 100` muestran **más** de 4 dígitos significativos (`1164,4894 → 1.164,49`, 6 significativos; `999,99 → 999,99`, 5). Es el resultado buscado, no un defecto.
- **Techo de 6 decimales**: los valores por debajo de `10⁻⁵` muestran **menos** de 4 dígitos significativos (`0,00000149 → 0,000001`). Preserva el comportamiento actual y evita anchos de columna absurdos; la precisión completa vive en el affordance de valor exacto.

El cálculo MUST ser aritmética propia y NO depender de `roundingPriority` ni de otras opciones de `Intl.NumberFormat` v3, cuya ausencia degradaría la precisión en silencio según el dispositivo.

#### Scenario: Factor de combustión en el rango que hoy se redondea a 2 decimales

- **WHEN** se formatea el factor `0,056944`
- **THEN** se muestra `0,05694` (5 decimales, 4 dígitos significativos), y NO `0,06`

#### Scenario: Factor con menos de 4 dígitos significativos no se rellena con ceros

- **WHEN** se formatea el factor `2,68`
- **THEN** se muestra `2,68`, y NO `2,6800`

#### Scenario: El piso de 2 decimales prevalece sobre los 4 dígitos significativos

- **WHEN** se formatea el factor `1164,4894` (valor real presente en los seeds)
- **THEN** se muestra `1.164,49`, porque el piso de 2 decimales impide que el redondeo a 4 significativos lo lleve a `1.164`

#### Scenario: Factor muy pequeño usa el techo de 6 decimales

- **WHEN** se formatea el factor `0,000123`
- **THEN** se muestra `0,000123`

#### Scenario: El techo de 6 decimales prevalece sobre los 4 dígitos significativos

- **WHEN** se formatea el factor `0,00000149`
- **THEN** se muestra `0,000001` (un solo dígito significativo), y el valor completo queda disponible en el affordance de valor exacto

#### Scenario: Valor no cero por debajo del umbral no se muestra como cero

- **WHEN** se formatea el factor `0,0000005`
- **THEN** se muestra la etiqueta `<0,000001`, porque la guarda de umbral se evalúa **antes** del formateo por magnitud (si se evaluara después, el redondeo a 6 decimales lo mostraría como `0,000001`)

#### Scenario: Cero no cae en la rama de umbral

- **WHEN** se formatea el factor `0`
- **THEN** se muestra `0`, y NO `<0,000001`

#### Scenario: La verificación manual cierra en el rango de cantidades donde el redondeo no domina

- **WHEN** una línea tiene cantidad `21600` y factor almacenado `0,056944`, y el usuario multiplica el factor **mostrado** (`0,05694`) por la cantidad
- **THEN** su resultado (`1.229,90 kg ≈ 1,23 t`) coincide con las emisiones informadas por la app (`1,23 t`), que se calculan con el factor completo (`1.229,99 kg`)

#### Scenario: Con cantidades grandes el redondeo de display sí divergiría, y la auditoría se resuelve por el valor exacto

- **WHEN** una línea tiene cantidad `10000000` y factor almacenado `0,056944`, de modo que el factor mostrado (`0,05694`) daría `569,40 t` frente a las `569,44 t` informadas
- **THEN** el usuario dispone del valor exacto del factor y de la cadena de cálculo con el factor sin redondear para reconciliar la diferencia, sin que el formato de display cambie por fila

#### Scenario: Emisiones y cantidades no cambian de formato

- **WHEN** se formatean emisiones (`emissions()`) o cantidades (`quantity()`)
- **THEN** conservan exactamente el formato previo a este change (máximo 2 decimales sobre `10⁻²`, rama adaptativa por debajo)

### Requirement: El valor del factor sin redondeo de display está disponible bajo demanda

Donde se muestre el factor principal de una línea o de la tabla de factores, la UI SHALL exponer bajo demanda el valor **tal como lo entrega el API**, sin ningún redondeo de display, bajo una etiqueta que lo identifique como el valor usado en el cálculo.

El API entrega los factores como número de doble precisión (`Decimal.toNumber()` en el servicio), no como decimal canónico; para cualquier factor de la magnitud que maneja el producto eso preserva los 10 decimales que guarda la columna `Decimal(28,10)`. La garantía normativa es **"sin redondeo adicional respecto de lo que el API entregó"**, no la fidelidad decimal exacta de la BD, que exigiría transportar el valor como string.

El affordance MUST ser accesible por teclado y por toque, no exclusivamente por `hover` de escritorio.

El requisito aplica al **factor principal**. Las líneas de desglose por gas de la tabla de factores heredan la nueva precisión de display, pero NO requieren affordance de valor exacto en este change.

#### Scenario: El usuario consulta el valor sin redondear desde la grilla del paso 3

- **WHEN** el usuario enfoca o toca el factor mostrado `0,05694` de una línea cuyo valor entregado por el API es `0,056944`
- **THEN** se muestra `0,056944` identificado como el valor usado en el cálculo

#### Scenario: También disponible en la tabla de factores del paso 4

- **WHEN** el usuario enfoca o toca el factor principal en la tabla de factores del resumen
- **THEN** se muestra el mismo valor sin redondeo de display, con idéntico criterio

#### Scenario: Disponible sin mouse

- **WHEN** el usuario llega al factor navegando con teclado, o lo toca en un dispositivo táctil
- **THEN** el valor se muestra igual que con `hover`

#### Scenario: El desglose por gas mejora su precisión pero no gana affordance

- **WHEN** la tabla de factores muestra las líneas de desglose por gas de un factor
- **THEN** sus valores se formatean con la nueva regla de precisión, y no exponen affordance de valor exacto

### Requirement: La cadena del cálculo es visible en la celda de emisiones de una línea detallada

Para una línea en modo detallado cuya emisión es computable, la UI SHALL exponer bajo demanda la cadena completa del cálculo en la celda de **emisiones**: cantidad con su unidad, factor **sin redondear** con su unidad de tasa, el resultado en kg y su conversión a toneladas.

La cadena SHALL exponerse mediante el mismo tipo de affordance que el valor sin redondear, y NO como una fila desplegable de la grilla. SHALL implementarse únicamente en la grilla del paso 3; la tabla de líneas por subcategoría del paso 4 queda fuera de alcance.

Una línea sin cantidad o sin factor NO SHALL mostrar cadena. En modo total manual la grilla no está montada, así que no existe celda de emisiones ni cadena que mostrar.

#### Scenario: Línea detallada completa

- **WHEN** el usuario consulta la celda de emisiones de una línea con cantidad `21600` L y factor entregado `0,056944` kg CO₂e/L
- **THEN** se muestra la cadena `21.600 L × 0,056944 kg CO₂e/L = 1.229,99 kg = 1,23 t`, con el factor sin redondear

#### Scenario: Subcategoría en modo total manual

- **WHEN** una subcategoría tiene activo el modo de total manual
- **THEN** la grilla de líneas no está montada y no se muestra ninguna cadena de cálculo, ni en el total del encabezado

#### Scenario: Línea incompleta

- **WHEN** una línea tiene cantidad pero no factor, o factor pero no cantidad
- **THEN** no se muestra cadena de cálculo

### Requirement: La entrada de factores propios acepta la misma precisión que preserva la base de datos

El input de factor propio SHALL aceptar hasta **10 decimales**, igualando la precisión de la columna `Decimal(28,10)` que lo almacena, de modo que el valor tipeado o pegado por el usuario no se trunque en silencio. El límite SHALL vivir en una constante nombrada propia del factor, y NO SHALL agregar ceros de relleno.

`INPUT_DECIMAL_SCALE = 4` MUST permanecer sin cambios: es el valor por defecto de los inputs numéricos decimales de la app (con excepciones ya existentes, como `FormNumericField` forzando escala `0` cuando `onlyInteger` está activo).

#### Scenario: Factor propio con más de 4 decimales sobrevive el ciclo completo

- **WHEN** el usuario ingresa `0,0569441234` como factor propio, guarda la huella y vuelve a cargar la pantalla
- **THEN** el valor recuperado del servidor conserva los 10 decimales, sin truncarse en el input, en el envío ni en la persistencia

#### Scenario: Los demás inputs numéricos no cambian

- **WHEN** el usuario ingresa una cantidad, o cualquier valor en otro `NumericInput` decimal de la app
- **THEN** el límite de decimales sigue siendo 4, y los inputs con `onlyInteger` siguen en `0`

### Requirement: El export a Excel muestra el factor con precisión suficiente en las dos hojas donde aparece

El factor de emisión aparece en dos hojas del export, y cada una tiene un defecto distinto que SHALL corregirse:

- **`Detalle emisiones`**: la celda ya contiene el valor numérico, pero su formato de número (`#,##0.00`) lo **muestra** con 2 decimales, replicando en la planilla el mismo problema que la app. SHALL usar un formato de número con decimales suficientes para el factor, distinto del formato de cantidades y emisiones.
- **`Factores utilizados`**: la celda contiene hoy una cadena preformateada que concatena factor redondeado y unidad. SHALL pasar a valor numérico con formato propio, dejando la unidad de tasa fuera del **valor** de la celda. Como la unidad de tasa varía por fila, SHALL viajar en el formato de número de la celda y NO en el encabezado de la columna, que solo puede llevar una.

#### Scenario: El factor exportado es operable y legible en la planilla

- **WHEN** se exporta un inventario cuyo factor entregado es `0,056944`
- **THEN** en ambas hojas la celda del factor contiene el número `0,056944`, se **muestra** con sus decimales y una fórmula de la planilla puede multiplicarla por la cantidad

#### Scenario: La unidad de tasa sigue siendo identificable

- **WHEN** el usuario abre la hoja `Factores utilizados` con dos factores de unidades distintas (`kg CO₂e/L` y `kg CO₂e/kWh`)
- **THEN** cada celda se **ve** con su propia unidad (`0,056944 kg CO₂e/L`), mientras su **valor** sigue siendo el número `0,056944` que una fórmula puede multiplicar

#### Scenario: Cantidades y emisiones conservan su formato de número

- **WHEN** se abre la hoja `Detalle emisiones`
- **THEN** las columnas de cantidad y de emisiones conservan el formato `#,##0.00` previo, y solo la columna del factor cambia
