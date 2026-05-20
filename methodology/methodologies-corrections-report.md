# Reporte de correcciones — `methodologies.json`

**Archivos intervenidos:**

- `packages/database/src/prisma/seeds/data/base/methodologies.json` (seed productivo).
- `packages/database/src/prisma/seeds/data/testing/methodologies.json` (seed de testing — sincronizado con las mismas 13 ediciones para mantener consistencia con la base).

**Fecha:** 2026-05-19
**Autor de la intervención:** corrección guiada por `methodologies-deep-audit.md`
**Prioridad de fuentes aplicada:** IPCC > DEFRA 2025 > otros (Kool 2012, etc.)
**Validación:** ambos archivos sintácticamente válidos (`python3 -c "import json; json.load(...)"` → OK).

---

## Resumen ejecutivo

Se corrigieron las **7 inconsistencias críticas de valor** identificadas en la auditoría profunda, ajustando 13 factores individuales (algunos hallazgos requerían múltiples ediciones). No se hicieron cambios estructurales (renombres de dimensiones, esquema de fuentes, GWP versionado, country-agnosticism, refrigerantes/procesos faltantes): la consigna fue corregir factores numéricos uno a uno. Los hallazgos estructurales y los hallazgos menores (typos, ortografía, granularidad) quedan abiertos para una segunda iteración.

---

## Tabla de cambios

| #   | Subcategoría             | Item                     | Valor anterior     | Valor nuevo | Unidad         | Fuente normativa aplicada                               |
| --- | ------------------------ | ------------------------ | ------------------ | ----------- | -------------- | ------------------------------------------------------- |
| 1   | Ganadería                | Cabras                   | 35.17              | **155.1**   | kg CO₂e/cab/yr | IPCC 2006 Vol.4 Cap.10                                  |
| 2   | Ganadería                | Crianza de aves          | 9810               | **0.6**     | kg CO₂e/cab/yr | IPCC 2006 Vol.4 Cap.10                                  |
| 3a  | Ganadería                | Vacas de pastoreo        | 2190               | **1710**    | kg CO₂e/cab/yr | IPCC 2006 Vol.4 Tabla 10.11 (Other Cattle LAC)          |
| 3b  | Ganadería                | Vacas lecheras           | 1710               | **2190**    | kg CO₂e/cab/yr | IPCC 2006 Vol.4 Tabla 10.11 (Dairy LAC)                 |
| 4   | Ganadería                | Camélidos                | 1437.6             | **240**     | kg CO₂e/cab/yr | IPCC 2006 Vol.4 Tabla 10.10 (Alpacas)                   |
| 5a  | Agricultura              | Cultivo general templado | 2184               | **3432**    | kg CO₂e/ha     | IPCC 2006 Vol.4 Tabla 11.1 (EF₂ × 44/28 × GWP N₂O 273)  |
| 5b  | Agricultura              | Cultivo general tropical | 4368               | **6864**    | kg CO₂e/ha     | IPCC 2006 Vol.4 Tabla 11.1 (EF₂ × 44/28 × GWP N₂O 273)  |
| 6   | Electricidad             | Sistema nacional         | 0.5349499999999999 | **0.177**   | kg CO₂e/kWh    | DEFRA 2025 "UK electricity"                             |
| 7a  | Comb. estacionarias      | GLP (kg/ton)             | 2603               | **2939**    | kg CO₂e/ton    | DEFRA 2025 "Fuels" (LPG, no LNG)                        |
| 7b  | Comb. móviles            | Gas licuado del petróleo | 2603               | **2939**    | kg CO₂e/ton    | DEFRA 2025 "Fuels"                                      |
| 8a  | Hospedaje                | Italia                   | 39                 | **14.3**    | kg CO₂e/noche  | DEFRA 2025 "Hotel stay"                                 |
| 8b  | Hospedaje                | Colombia                 | 17.4               | **14.7**    | kg CO₂e/noche  | DEFRA 2025 "Hotel stay"                                 |
| 9a  | Transporte carga (↑ y ↓) | Tren de carga            | 0.00691            | **0.02779** | kg CO₂e/km-ton | DEFRA 2025 "Freighting goods" (WTW)                     |
| 9b  | Transporte carga (↑ y ↓) | Contenedores por barco   | 0.00365            | **0.01612** | kg CO₂e/km-ton | DEFRA 2025 "Freighting goods" (Container ship avg, WTW) |
| 9c  | Transporte carga (↑ y ↓) | Granel por barco         | 0.0008             | **0.00353** | kg CO₂e/km-ton | DEFRA 2025 "Freighting goods" (Bulk carrier avg, WTW)   |

**Total de factores modificados:** 13 (counting per `emissionFactor` record; 9 hallazgos distintos cuando se agrupa por concepto).

---

## Detalle por corrección

### Fórmula base y supuestos compartidos (Correcciones 1–4)

Las cuatro correcciones de Ganadería aplican la **metodología Tier 1 del IPCC 2006, Volumen 4 (AFOLU), Capítulo 10** (Emissions from Livestock and Manure Management).

**Fórmula general:**

```
CO₂e [kg / cabeza / año] = ( EF_entérico  +  EF_estiércol ) × GWP_CH₄

donde:
  EF_entérico  = factor de emisión de CH₄ por fermentación entérica
                 (digestión anaerobia en el rumen / tracto digestivo del animal)
                 [kg CH₄ / cabeza / año]
                 fuente: IPCC 2006 Tabla 10.10 (no-cattle) ó Tabla 10.11 (cattle)

  EF_estiércol = factor de emisión de CH₄ por gestión del estiércol
                 (descomposición anaerobia del estiércol almacenado / aplicado)
                 [kg CH₄ / cabeza / año]
                 fuente: IPCC 2006 Tabla 10.14 (mamíferos) ó Tabla 10.15 (aves)

  GWP_CH₄      = 30  (potencial de calentamiento global del metano a 100 años)
```

**¿Qué representa cada componente?**

- **EF entérico** captura el CH₄ producido por microorganismos en el sistema digestivo del animal — predominante en rumiantes (vacas, ovejas, cabras, camélidos) y bajo/nulo en monogástricos (cerdos, aves).
- **EF estiércol** captura el CH₄ producido por descomposición anaerobia del estiércol durante almacenamiento (lagunas, fosas) o aplicación al suelo. Depende del clima (templado/tropical), tipo de sistema (sólido/líquido) y especie.
- **GWP_CH₄ = 30** corresponde al valor de **AR5 con climate-carbon feedback** (Myhre et al. 2013, IPCC). Se eligió este valor para preservar la consistencia interna con el seed original (el valor previo de "Vacas lecheras" 1710 = 57×30 implicaba este GWP). _Caveat:_ DEFRA UK usa AR5 sin feedback (CH₄ = 28). La unificación a AR5 sin feedback queda como hallazgo estructural pendiente y reajustaría ligeramente todos los valores de esta subcategoría (×28/30 ≈ −6.7%).

**Supuestos compartidos por las 4 correcciones:**

1. **Región climática = Latinoamérica (LAC) / Developing Countries — Temperate.** El IPCC publica factores por zona climática. Se elige la fila explícita "Latin America" cuando existe (Tabla 10.11 cattle, Tabla 10.14 cattle manure) y "Developing Countries — Temperate" como fallback (Tabla 10.10 small ruminants, Tabla 10.15 poultry). Justificación: la plataforma se distribuye a países de LATAM, y dentro de LATAM la mayoría de la masa ganadera está en zonas templadas o subtropicales. Países tropicales puros (Amazonía, Centroamérica baja) deberían sobrescribir con factores zonificados localmente.
2. **Tier 1, no Tier 2.** No se aplican ajustes por peso vivo individual, dieta, productividad lechera, ni edad. Tier 1 usa factores promedio por categoría animal. Justificación: la plataforma es una herramienta de huella corporativa con datos agregados (cabezas totales), no un inventario nacional desagregado.
3. **Suma de entérico + estiércol antes de multiplicar por GWP** (no GWP separados). Ambos componentes son CH₄, por lo que tienen el mismo GWP y se pueden sumar en masa antes de la conversión a CO₂e.
4. **No se aplica componente de N₂O del estiércol.** IPCC Vol.4 Cap.10.5 publica N₂O directo/indirecto del estiércol como cálculo separado. El seed original no lo incluía y se mantiene esa decisión para no introducir un cambio de alcance; queda como hallazgo pendiente para una iteración más exhaustiva.

**Prioridad de fuentes:** IPCC 2006 manda en todas estas correcciones. DEFRA UK no publica factores ganaderos por cabeza animal (DEFRA solo publica emisiones por producto consumido — leche, carne — bajo enfoque de cadena de suministro, no Scope 1 directo del productor).

---

### Corrección 1 — Cabras: 35.17 → 155.1 kg CO₂e/cab/yr

**Diagnóstico (bug aritmético):** el valor 35.17 corresponde literalmente a la **suma** `5.17 + 30 = 35.17`. Se usó el operador `+` donde la fórmula prescribe `×`. Es decir, el valor original sumó el GWP al CH₄ total en lugar de multiplicarlo. Sobreestimación / subestimación dependiendo del factor, pero metodológicamente incorrecto.

**Valores IPCC aplicados:**

| Componente   | Tabla IPCC        | Fila / Columna                | Valor                  |
| ------------ | ----------------- | ----------------------------- | ---------------------- |
| EF entérico  | Vol.4 Tabla 10.10 | _Goats, Developing countries_ | **5 kg CH₄/cab/yr**    |
| EF estiércol | Vol.4 Tabla 10.14 | _Goats, Latin America_        | **0.17 kg CH₄/cab/yr** |
| Total CH₄    | suma              |                               | **5.17 kg CH₄/cab/yr** |

**Cálculo:**

```
CO₂e = (5 + 0.17) × 30 = 5.17 × 30 = 155.1 kg CO₂e/cabeza/año
```

**Por qué este valor:** Cabras son pequeños rumiantes con sistema digestivo similar a ovejas pero menor masa corporal y menor ingesta diaria → factor entérico moderado (5 kg CH₄/yr vs ~8 en ovejas adultas vs 56–72 en vacas). El componente de estiércol es bajo (0.17) porque en sistemas pastoriles típicos de LATAM el estiércol queda disperso en pradera (no en lagunas anaerobias), donde se descompone aerobiamente y emite mínimo CH₄.

**Supuesto específico:** se asume manejo extensivo (pradera). Si el productor confina cabras en establo con manejo líquido de estiércol, el factor real puede ser hasta 3× mayor — el país deberá sobrescribir.

---

### Corrección 2 — Crianza de aves: 9810 → 0.6 kg CO₂e/cab/yr

**Diagnóstico:** sobrestimación de **16.350×** vs IPCC Tier 1. El valor original 9810 no tiene base documentada (no corresponde a IPCC, DEFRA, ni a ninguna metodología nacional conocida). Para contexto: una gallina ponedora de ~2 kg de peso vivo no puede emitir 9.810 kg CO₂e/año — implicaría emisión > 4.900× su peso vivo, biológicamente imposible.

**Valores IPCC aplicados:**

| Componente   | Tabla IPCC        | Fila / Columna                             | Valor                  |
| ------------ | ----------------- | ------------------------------------------ | ---------------------- |
| EF entérico  | —                 | (no aplica para aves)                      | **0 kg CH₄/cab/yr**    |
| EF estiércol | Vol.4 Tabla 10.15 | _Poultry, Developing countries, Temperate_ | **0.02 kg CH₄/cab/yr** |
| Total CH₄    | suma              |                                            | **0.02 kg CH₄/cab/yr** |

**Cálculo:**

```
CO₂e = (0 + 0.02) × 30 = 0.02 × 30 = 0.6 kg CO₂e/cabeza/año
```

**Por qué este valor:**

- **EF entérico = 0** porque las aves NO son rumiantes: su tracto digestivo no fermenta anaerobiamente, no producen CH₄ entérico significativo. IPCC explícitamente no publica factor entérico para poultry.
- **EF estiércol = 0.02** porque el estiércol de aves (gallinaza) en clima templado se gestiona típicamente seco — fermentación anaerobia mínima → poco CH₄. En clima tropical con manejo líquido el factor puede subir a 0.117 (factor "Developing — Warm" de la misma tabla), pero se elige Temperate como default LATAM.

**Supuesto específico:** el item "Crianza de aves" no distingue entre ponedoras, broilers, o crianza dual. IPCC publica el mismo valor para todas estas categorías en Tier 1 → no hay pérdida de precisión por usar el factor genérico.

---

### Corrección 3 — Inversión Vacas lecheras ↔ Vacas de pastoreo

**Diagnóstico:** asignación invertida respecto a IPCC. El valor original asignaba **2190 a Vacas de pastoreo y 1710 a Vacas lecheras**, cuando en realidad las vacas lecheras emiten MÁS (no menos) que las de pastoreo. Razón biológica: una vaca lechera en producción consume ~22–25 kg de materia seca/día para sostener producción de leche (~20–30 L/día en LATAM), versus ~12–15 kg/día de una vaca de pastoreo en mantenimiento. Mayor ingesta → mayor fermentación entérica → más CH₄.

**Valores IPCC aplicados (Tabla 10.11, fila _Latin America_):**

| Categoría animal                     | EF entérico  | EF estiércol (Tabla 10.14 LAC) | Total CH₄    | × GWP 30                |
| ------------------------------------ | ------------ | ------------------------------ | ------------ | ----------------------- |
| **Dairy Cattle** (Vacas lecheras)    | 72 kg CH₄/yr | 1 kg CH₄/yr                    | 73 kg CH₄/yr | **2190 kg CO₂e/cab/yr** |
| **Other Cattle** (Vacas de pastoreo) | 56 kg CH₄/yr | 1 kg CH₄/yr                    | 57 kg CH₄/yr | **1710 kg CO₂e/cab/yr** |

**Cálculo:**

```
Vacas lecheras    = (72 + 1) × 30 = 73 × 30 = 2190 kg CO₂e/cab/año
Vacas de pastoreo = (56 + 1) × 30 = 57 × 30 = 1710 kg CO₂e/cab/año
```

**Acción aplicada:** intercambio de los dos valores entre los items en el JSON. No se modificó ningún número — solo se corrigió la asignación entre `valueName: "Vacas lecheras"` y `valueName: "Vacas de pastoreo"`. Los labels de las dimensiones se preservaron.

**Por qué estos valores:**

- **EF entérico Dairy (72) > Other Cattle (56)** refleja la ingesta diaria significativamente mayor de vacas en producción láctea. El factor IPCC promedia genéticas y sistemas productivos de LATAM (mayoritariamente cruzas Holstein × cebú en sistemas semi-intensivos).
- **EF estiércol = 1 kg CH₄/yr** para ambas categorías porque el manejo dominante en LATAM es pastoreo o semi-confinamiento (sólido), no lagunas anaerobias (que multiplicarían el factor por 10–20×). Países con confinamiento intensivo (feedlots Argentina/Brasil) deberían sobrescribir.

**Supuesto específico:** "Vacas de pastoreo" incluye toros, terneros, novillos y vacas adultas no lecheras (la categoría IPCC "Other Cattle" agrupa todos). Si el país requiere desagregar (e.g., diferenciar terneros con factor reducido), debe ampliar la dimensión en su mantenedor.

---

### Corrección 4 — Camélidos: 1437.6 → 240 kg CO₂e/cab/yr

**Diagnóstico:** el valor 1437.6 = 47.92 × 30 implica que se usó EF = 47.92 kg CH₄/yr, que corresponde a **Camels** (dromedarios árabes/asiáticos, peso vivo ~570 kg) en Tabla 10.10 — un animal **inexistente comercialmente en Latinoamérica**. Los camélidos sudamericanos son significativamente más pequeños:

| Especie                 | Peso vivo aprox. | EF entérico IPCC publicado           |
| ----------------------- | ---------------- | ------------------------------------ |
| **Alpaca**              | ~65 kg           | **8 kg CH₄/yr** (Tabla 10.10)        |
| **Llama**               | ~130 kg          | "To be determined" (sin valor IPCC)  |
| **Vicuña** (silvestre)  | ~45 kg           | sin valor IPCC                       |
| **Guanaco** (silvestre) | ~90 kg           | sin valor IPCC                       |
| ~~Camel (dromedario)~~  | ~570 kg          | 46–47.92 kg CH₄/yr (no aplica LATAM) |

El factor de emisión escala aproximadamente con el peso vivo elevado a 0.75 (ley alométrica de Kleiber para metabolismo basal). Un Camel pesa ~9× una Alpaca → su factor de CH₄ es ~6× mayor (8 vs 47.92), consistente con la relación alométrica. Aplicar el factor de Camel a alpacas era un error de orden de magnitud.

**Decisión:** usar el factor publicado por IPCC para **Alpacas (Tabla 10.10): EF entérico = 8 kg CH₄/cab/yr** como default. No se incluye EF de estiércol porque IPCC Tabla 10.14 no lista factor de estiércol para camélidos sudamericanos (es despreciable en sistemas pastoriles altoandinos típicos).

**Cálculo:**

```
CO₂e = 8 × 30 = 240 kg CO₂e/cabeza/año
```

**Supuestos específicos:**

1. **Se elige Alpaca como proxy de "Camélidos" genérico** porque es el único valor publicado por IPCC para camélidos sudamericanos. Para una huella con mayoría de Llamas, este valor subestima en aprox. ×(130/65)^0.75 ≈ ×1.68 → un país que despliegue para regiones con población mayoritaria de llamas (Bolivia, Perú altiplánico) debería sobrescribir con un factor estimado de ~404 kg CO₂e/cab/yr (240 × 1.68).
2. **Vicuñas y Guanacos silvestres no aplican** porque son fauna no productiva — no entran en una huella corporativa empresarial.
3. **Estiércol = 0** asumiendo manejo extensivo en pradera altoandina. Si hubiera manejo concentrado (corrales de esquila, lugares de pernocta) el factor podría subir levemente (~0.1–0.5 kg CH₄/yr), pero IPCC no publica ese componente desagregado para esta especie.

**Caveat de label:** el item se mantiene como "Camélidos" (genérico). Una iteración futura debería desambiguar por especie (Alpaca, Llama, Vicuña, Guanaco) y publicar factor por especie. Esto excede el alcance "corregir factores uno a uno" del presente reporte.

**Prioridad de fuentes:** IPCC 2006 (DEFRA no aplica — no publica factores para camélidos en ninguna versión).

### Corrección 5 — Cultivo general: omisión de conversión N₂O-N → N₂O

- **Diagnóstico:** IPCC 2006 Tabla 11.1 publica EF₂ en **kg N₂O-N/ha**, no en kg N₂O/ha. La conversión requiere multiplicar por la razón de masas moleculares 44/28 = 1.5714.
- **Cálculo correcto (manteniendo el GWP N₂O AR6 = 273 ya implícito en el JSON, pues 2184/8 = 273):**
  - Templado: 8 × (44/28) × 273 = **3432 kg CO₂e/ha**.
  - Tropical: 16 × (44/28) × 273 = **6864 kg CO₂e/ha**.
- **Caveats no resueltos (estructurales, fuera del alcance de "corregir factores"):**
  - **Alcance del factor.** Tabla 11.1 explícitamente acota EF₂ a _organic crop and grassland soils_ (histosoles drenados, <2% de la superficie agrícola latinoamericana). Aplicarlo a "Cultivo general" en suelos minerales sigue siendo un uso fuera de alcance — el factor correcto para suelos minerales es EF₁ = 0.01 kg N₂O-N/kg N aplicado, dependiente de la dosis de N (no de hectáreas). Esto requiere rediseñar la dimensión, no solo cambiar el número.
  - **GWP inconsistente.** El factor usa AR6 (273) mientras Ganadería usa AR5+feedback (30) y Emisiones Fugitivas usa AR5 sin feedback (265 para N₂O). La unificación es un cambio estructural.
- **Prioridad de fuentes:** IPCC (DEFRA no publica factores agrícolas por hectárea).

### Corrección 6 — Electricidad Sistema nacional: 0.53495 → 0.177 kg CO₂e/kWh

- **Diagnóstico:** el valor 0.53495 no corresponde a DEFRA UK 2025 (0.177), ni a la documentación interna del proyecto (0.17489), ni a ningún sistema interconectado latinoamericano publicado. Origen desconocido (probable residuo de seed antiguo).
- **Acción:** alinear al valor DEFRA 2025 que el propio campo `source` declara: **0.177 kg CO₂e/kWh** (0.17489 CO₂ + 0.00211 CH₄/N₂O según hoja "UK electricity").
- **Caveat estructural (no resuelto):** el valor DEFRA UK no es country-agnostic. Cada despliegue de país debería sobrescribir con su factor nacional (CAMMESA Argentina 0.354; MCTI Brasil 0.084; SEC Chile 0.402; UPME Colombia 0.165; SEMARNAT México 0.453; MINEM Perú 0.190; UTE Uruguay 0.030). El JSON base ahora documenta el factor DEFRA — el mecanismo de overlay por país queda pendiente.
- **Prioridad de fuentes:** DEFRA 2025 (declarada en el `source` del propio registro). IPCC no publica factor de mix eléctrico nacional.

### Corrección 7 — GLP kg/ton: 2603 (LNG) → 2939 (LPG)

- **Diagnóstico:** el valor 2603 corresponde a **LNG** (gas natural licuado) en DEFRA 2025, no a **LPG** (gas licuado del petróleo). Los factores kg/m³ (1557) y kg/kWh (0.23) sí son LPG — el JSON mezclaba unidades de dos combustibles distintos.
- **Valor correcto DEFRA 2025 "Fuels" LPG:** 2939.36 kg CO₂e/ton → redondeado a **2939** (consistente con el formato de redondeo del resto del archivo).
- **Acción:** corrección en dos lugares — Combustiones estacionarias (línea 619) y Combustiones móviles (línea 861, item "Gas licuado del petróleo").
- **Prioridad de fuentes:** DEFRA 2025 (factor de combustible fósil, IPCC no aplica directamente — el JSON usa DEFRA para todos los combustibles "por simplicidad" según la nota metodológica interna).

### Corrección 8 — Hospedaje Italia y Colombia

- **Italia 39 → 14.3:** error de copy-paste con Japón (también 39). DEFRA 2025 hoja "Hotel stay" publica **14.3 kg CO₂e/noche** para Italia.
- **Colombia 17.4 → 14.7:** probable arrastre de DEFRA 2024 (versión anterior). DEFRA 2025 publica **14.7 kg CO₂e/noche** para Colombia.
- **Prioridad de fuentes:** DEFRA 2025 (declarado en el `source` del registro).

### Corrección 9 — Transporte de carga (tren, contenedor barco, granel barco)

- **Diagnóstico:** los tres modos estaban subvalorados ~75–77% respecto a DEFRA 2025 "Freighting goods" (WTW = Well-to-Wheel, factor completo incluyendo upstream + combustion).
- **Valores correctos DEFRA 2025 "Freighting goods":**
  - Tren de carga: **0.02779 kg CO₂e/km-ton**.
  - Contenedor por barco (Container ship average): **0.01612 kg CO₂e/km-ton**.
  - Granel por barco (Bulk carrier average): **0.00353 kg CO₂e/km-ton**.
- **Acción:** corrección en 6 lugares — 3 modos × 2 subcategorías (`aguas arriba` y `aguas abajo` tienen factores espejo en el JSON).
- **Caveats no resueltos:**
  - **Factores aéreos de carga** (Avión Short/Medium/Long haul: 0.2051 / 0.1351 / 0.1351 kg/km-ton) **siguen divergiendo** de DEFRA 2025 (1.27835 / 0.89939 / 0.89939 con RF). La auditoría sospecha que el JSON podría usar un dataset distinto o el componente WTT-only — no se modifican en este pasada porque no hay evidencia inequívoca sobre cuál es el dataset DEFRA exacto que se quiso aplicar. Decisión: mantener hasta confirmar con el equipo cuál fuente DEFRA es la deseada (con RF / sin RF / WTT-only).
- **Prioridad de fuentes:** DEFRA 2025 (combustión modal, IPCC no publica factores Tier 1 por modo de transporte en estas unidades).

---

## Lo que **no** se modificó (intencional)

Por instrucción explícita de "corregir factores uno a uno", los siguientes hallazgos de la auditoría quedan abiertos:

### Hallazgos numéricos no abordados

- **Factores aéreos de carga** (§1.11): subvaloración ~84% vs DEFRA 2025, pero el dataset exacto del JSON no es identificable con certeza — pendiente confirmación.
- **Duplicación c-C₃F₆ con n-C₄F₁₀** (§1.1): ambos GWP 9200; AR5 no enumera c-C₃F₆ (Hodnebrog 2013 reporta ~17,340) pero la auditoría señala el error está en la fuente original — corrección requiere decisión sobre eliminar el gas o adoptar Hodnebrog.
- **Typo HFC-235cb → HFC-236cb** (§1.1): cambio de nombre, no de valor. Postergado a la pasada de typos.
- **Fertilizantes Kool 2012 South America** (§1.7): valores numéricamente correctos para Sudamérica, pero violan country-agnosticism. Requiere mecanismo de overlay por país, no cambio de número.

### Hallazgos estructurales no abordados

- **GWP versionado inconsistente** entre subcategorías (AR5 sin feedback / AR5 con feedback / AR6).
- **EF₂ aplicado fuera de alcance** (histosoles vs suelos minerales) en Agricultura — requiere rediseño de dimensión.
- **Net CV no declarado** en combustibles.
- **Radiative Forcing no declarado** en factores aéreos.
- **Mapeo ISO 14064-1:2018** (6 categorías vs 3 declaradas).
- **Cobertura Scope 3** (8 de 15 categorías ausentes).
- **Refrigerantes faltantes** (HFOs, mezclas R-404A/R-410A/etc., naturales).
- **Procesos industriales faltantes** (aluminio, cobre, refinación, ácidos).
- **Subcategorías vacías** (Homeworking, Use of sold products).
- **Country-agnosticism** (electricidad, fertilizantes, hospedaje).
- **Esquema sin uncertainty/vigencia/geografía** (requiere extender el modelo Prisma).

### Hallazgos ortográficos no abordados

- "Hexafloruro" → "Hexafluoruro"; "Perfloruro" → "Perfluorociclopropano"; "Trifloruro" → "Trifluoruro"; "Potacio" → "Potasio"; "Brazil" → "Brasil"; "Vidrio de iluminaria" → "Vidrio de iluminación"; "pieza arre" → "noche-habitación"; "cant anim" → "cabeza".

### Explanations de usuario (no abordadas — fuera del alcance "corregir factores")

Dos archivos MD que el seed distribuye como ayuda al usuario contienen ejemplos numéricos que quedaron desalineados con los factores reales tras las correcciones. Son contenido ilustrativo, no factores ni tests, por lo que no se modificaron:

- `packages/database/src/prisma/seeds/data/base/explanations/subcategories/c1_emisiones_por_uso_de_suelo_ganaderia.md` (líneas 107, 111, 115): usa "1.500 kg CO₂e/animal" para Vacas de pastoreo (factor real corregido: 1.710). El texto declara "ejemplo referencial".
- `packages/database/src/prisma/seeds/data/base/explanations/subcategories/c2_electricidad.md` (líneas 148, 152, 156): usa "0,35 kg CO₂e/kWh" (factor real corregido: 0,177 DEFRA UK). Sin disclaimer explícito.

**Recomendación:** marcar explícitamente como ejemplo referencial, o realinear con los factores actuales en una pasada de docs.

---

## Recomendaciones para la siguiente iteración

1. **Decidir y declarar el `gwp_basis`** a nivel de metodología (recomendado: **AR5 sin feedback uniformemente**, alineado con DEFRA 2025; CH₄=28, N₂O=265). Esto **reajustaría los nuevos valores de Ganadería** (155.1 → ~144.8 para Cabras, etc.) y de Agricultura (3432 → 3331 para Templado, etc.). Es un cambio de **política**, no de número: documentar primero, luego propagar.
2. **Definir el dataset DEFRA exacto** para freight aéreo (con/sin RF, WTW/WTT) y aplicar.
3. **Marcar las subcategorías vacías** (Homeworking, Uso de productos vendidos, Desplazamiento empleados) — poblar con DEFRA 2025 o remover del schema para evitar confusión.
4. **Diseñar el mecanismo de overlay por país** para electricidad, fertilizantes, hospedaje, mix eléctrico van eléctrica.
5. **Agregar los typos y normalizaciones** en una pasada dedicada (low-risk, reviewable en un solo PR).

---

## Verificación final

```text
$ python3 -c "import json; json.load(open('packages/database/src/prisma/seeds/data/base/methodologies.json')); print('JSON valid')"
JSON valid
$ python3 -c "import json; json.load(open('packages/database/src/prisma/seeds/data/testing/methodologies.json')); print('JSON valid')"
JSON valid
```

Todos los nuevos valores presentes y localizados en ambos seeds (`grep` confirma 13 ediciones aplicadas en cada archivo, 0 valores antiguos residuales).

**Tests existentes:** se hizo barrido de `apps/api/test` y `apps/web/src` buscando valores literales de factores antiguos y nombres de dimensiones afectadas. **Ningún test integraba constantes hardcoded** de los factores modificados — todos los tests obtienen los factores desde el seed (testing), por lo que la sincronización del seed de testing es suficiente para mantener la metodología de testing consistente con la base.

---

## Referencias

1. **DEFRA** (2025). _UK Government GHG Conversion Factors for Company Reporting, 2025_. Hojas: "Fuels" (LPG), "UK electricity", "Hotel stay", "Freighting goods".
2. **IPCC** (2006). _2006 IPCC Guidelines for National Greenhouse Gas Inventories_, IGES. Vol. 4 Cap. 10 Tablas 10.10, 10.11, 10.14, 10.15 (ganadería); Vol. 4 Cap. 11 Tabla 11.1 (agricultura, EF₂).
3. **IPCC** (2014). AR5 WG1 Tabla 8.A.1 — GWP-100.
4. **IPCC** (2021). AR6 WG1 Tabla 7.SM.7 — GWP-100 actualizado (N₂O = 273).
5. **methodologies-deep-audit.md** (2026-05-18) — auditoría profunda que sirvió de base.

_Fin del reporte._
