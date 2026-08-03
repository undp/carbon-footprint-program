## ADDED Requirements

### Requirement: La intensidad de emisiones elige su unidad de masa según la magnitud

El formateador de intensidad SHALL elegir la unidad de masa buscando que el número presentado caiga en el rango `[1, 1000)`, partiendo de una tasa expresada en toneladas de CO₂e por unidad de actividad principal:

- tasa `≥ 1 t` → `t CO₂e`
- tasa `≥ 0,001 t` (es decir `≥ 1 kg`) y `< 1 t` → `kg CO₂e`
- resto → `g CO₂e`

El rango `[1, 1000)` es el objetivo, no una garantía absoluta: **no existe unidad mayor que la tonelada** en esta escala, así que una tasa de `1200` tCO₂e por unidad se presenta como `1.200 t CO₂e`, fuera del rango, con separador de miles.

La selección de unidad MUST hacerse sobre el valor crudo, **antes** de redondear. El número SHALL mostrarse con un máximo de 2 decimales y **sin ceros de relleno**.

Si tras redondear el número alcanza `1000` y existe una unidad mayor, SHALL promoverse a esa unidad y volver a formatearse — de lo contrario una tasa de `0,999999 t` se presentaría como `1.000 kg` en vez de `1 t`.

Una tasa positiva que no alcance a mostrarse con 2 decimales en gramos SHALL renderizarse como el piso `<0,01 g CO₂e`. Una tasa de cero SHALL renderizarse como `0 g CO₂e`.

Los umbrales SHALL vivir como constantes nombradas de configuración, no como literales dispersos en los componentes.

#### Scenario: Intensidad del orden de toneladas

- **WHEN** la tasa es `1,23` tCO₂e por unidad de actividad
- **THEN** se presenta el valor `1,23` con la unidad `t CO₂e`

#### Scenario: Intensidad del orden de kilogramos

- **WHEN** la tasa es `0,00425` tCO₂e por unidad de actividad
- **THEN** se presenta el valor `4,25` con la unidad `kg CO₂e`

#### Scenario: Intensidad del orden de gramos — el caso reportado

- **WHEN** la tasa cruda es `0,0000569444` tCO₂e por litro producido (un total de `1,2299904` tCO₂e dividido por `21.600` litros)
- **THEN** se presenta el valor `56,94` con la unidad `g CO₂e`, y NO `0,000057` con la unidad `tCO₂e`

#### Scenario: Intensidad que da un número entero de gramos

- **WHEN** la tasa cruda es exactamente `0,000057` tCO₂e por unidad
- **THEN** se presenta el valor `57` con la unidad `g CO₂e`, sin ceros de relleno

#### Scenario: Borde exacto entre toneladas y kilogramos

- **WHEN** la tasa es exactamente `1` tCO₂e por unidad
- **THEN** se presenta el valor `1` con la unidad `t CO₂e`

#### Scenario: Borde exacto entre kilogramos y gramos

- **WHEN** la tasa es exactamente `0,001` tCO₂e por unidad
- **THEN** se presenta el valor `1` con la unidad `kg CO₂e`

#### Scenario: El redondeo no debe empujar el número fuera de su unidad

- **WHEN** la tasa es `0,000999999` tCO₂e por unidad, que en gramos redondea a `1000`
- **THEN** se promueve a la unidad mayor y se presenta `1` con la unidad `kg CO₂e`, y NO `1.000` con la unidad `g CO₂e`

#### Scenario: Tasa por encima del rango objetivo

- **WHEN** la tasa es `1200` tCO₂e por unidad
- **THEN** se presenta `1.200` con la unidad `t CO₂e`, porque no existe unidad mayor

#### Scenario: Tasa ínfima usa el piso en vez de mostrarse como cero

- **WHEN** la tasa positiva es menor que `0,01` g CO₂e por unidad
- **THEN** se presenta `<0,01 g CO₂e`

#### Scenario: Tasa cero

- **WHEN** la tasa es `0`
- **THEN** se presenta `0` con la unidad `g CO₂e`

### Requirement: El formateador devuelve valor y unidad por separado

El formateador de intensidad SHALL devolver `{ value, unit }`, donde `value` es el número ya formateado según la localización de la app y `unit` es **solo** la unidad de masa (`t CO₂e` / `kg CO₂e` / `g CO₂e`). El nombre de la actividad principal SHALL concatenarlo el consumidor, porque cada uno lo compone distinto.

La razón es que la tarjeta de equivalencia renderiza número y unidad en dos elementos tipográficos distintos (el número en tamaño hero), y que ambos consumidores deben derivar su unidad de la **misma** función para no divergir.

#### Scenario: La tarjeta compone número y unidad por separado

- **WHEN** la tarjeta de equivalencia recibe `{ value: "56,94", unit: "g CO₂e" }` y el nombre de actividad `litros producidos`
- **THEN** renderiza `56,94` en la tipografía hero y `g CO₂e/litros producidos` como unidad

#### Scenario: Los dos consumidores muestran la misma unidad para el mismo inventario

- **WHEN** un inventario cuya intensidad cae en el tramo de gramos se ve en la tarjeta de equivalencia y en el caption del resumen
- **THEN** ambos muestran el mismo valor y la misma unidad

### Requirement: La escala adaptativa se limita a la equivalencia por actividad principal

La unidad adaptativa SHALL aplicarse únicamente a los consumidores de la tasa de equivalencia por actividad principal: la tarjeta de equivalencia (visible en el paso 5 y en la pantalla de inicio) y el caption de la barra de total del paso 4.

El total de emisiones del inventario, los rankings y el portal de transparencia MUST seguir expresándose en tCO₂e, para preservar la comparabilidad entre inventarios y organizaciones.

#### Scenario: El total del inventario no cambia de unidad

- **WHEN** un inventario tiene un total de `0,004` tCO₂e
- **THEN** el total se sigue mostrando en tCO₂e, aunque su equivalencia por actividad se muestre en gramos

#### Scenario: Rankings y transparencia intactos

- **WHEN** se listan inventarios en rankings o en el portal de transparencia
- **THEN** todos los valores comparados se expresan en la misma unidad (tCO₂e), sin escala adaptativa

#### Scenario: La tarjeta escala en todas sus ubicaciones

- **WHEN** la tarjeta de equivalencia se renderiza en el paso 5 o en la pantalla de inicio
- **THEN** aplica la misma escala adaptativa en ambas
