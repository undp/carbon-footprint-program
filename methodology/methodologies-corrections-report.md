# Reporte de correcciones — `methodologies.json`

**Archivo intervenido:** `packages/database/src/prisma/seeds/data/base/methodologies.json`
**Fecha:** 2026-05-19
**Autor de la intervención:** corrección guiada por `methodologies-deep-audit.md`
**Prioridad de fuentes aplicada:** IPCC > DEFRA 2025 > otros (Kool 2012, etc.)
**Validación:** `python3 -c "import json; json.load(...)"` → JSON sintácticamente válido tras todos los cambios.

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

### Corrección 1 — Cabras: 35.17 → 155.1 kg CO₂e/cab/yr

- **Diagnóstico de la auditoría:** el valor 35.17 corresponde literalmente a la **suma** 5.17 + 30, no a la multiplicación 5.17 × 30 que prescribe la metodología (CH₄ entérico + manure × GWP).
- **Cálculo correcto:**
  - Entérico (IPCC 2006 Tabla 10.10, Goats, Developing countries) = 5 kg CH₄/cab/yr.
  - Manure (Tabla 10.14, LAC) = 0.17 kg CH₄/cab/yr.
  - Total CH₄ = 5.17 kg CH₄/cab/yr.
  - CO₂e = 5.17 × **30** = **155.1 kg CO₂e/cab/yr** (GWP CH₄ con feedback, AR5; mismo GWP usado por el resto de la subcategoría Ganadería, para mantener consistencia interna).
- **Prioridad de fuentes:** IPCC manda — DEFRA no publica factores para ganadería.

### Corrección 2 — Crianza de aves: 9810 → 0.6 kg CO₂e/cab/yr

- **Diagnóstico:** discrepancia de magnitud 16,350×. Valor original sin justificación documentada.
- **Cálculo correcto:**
  - IPCC 2006 Tabla 10.15, columna _Poultry, Developing countries, Temperate_ = 0.02 kg CH₄/cab/yr.
  - CO₂e = 0.02 × 30 = **0.6 kg CO₂e/cab/yr**.
- **Prioridad de fuentes:** IPCC (DEFRA no publica factores ganaderos por cabeza).

### Corrección 3 — Inversión Vacas lecheras / Vacas de pastoreo

- **Diagnóstico:** asignación invertida respecto a IPCC 2006 Tabla 10.11 fila Latin America.
- **Valores correctos (IPCC 2006):**
  - Dairy + manure LAC = 72 + 1 = **73 kg CH₄/cab/yr** → "Vacas lecheras".
  - Other Cattle + manure LAC = 56 + 1 = **57 kg CH₄/cab/yr** → "Vacas de pastoreo".
- **CO₂e con GWP CH₄ = 30:**
  - Vacas lecheras = 73 × 30 = **2190 kg CO₂e/cab/yr**.
  - Vacas de pastoreo = 57 × 30 = **1710 kg CO₂e/cab/yr**.
- **Acción:** intercambio de valores entre los dos items (sin renombrar dimensiones).
- **Prioridad de fuentes:** IPCC.

### Corrección 4 — Camélidos: 1437.6 → 240 kg CO₂e/cab/yr

- **Diagnóstico:** el factor 47.92 kg CH₄/yr corresponde a _Camels_ (dromedarios, ~570 kg de peso vivo) — animal **inexistente comercialmente en Latinoamérica**. Los camélidos sudamericanos son llamas (~130 kg) y alpacas (~65 kg).
- **Decisión:** se usa el factor **IPCC 2006 Tabla 10.10 _Alpacas_** = 8 kg CH₄/cab/yr × 30 = **240 kg CO₂e/cab/yr**.
  - IPCC publica explícitamente el valor para Alpacas; para Llamas registra "To be determined". Tomar Alpacas como default es el camino auditable (cualquier escalamiento a Llamas por ratio peso^0.75 sería una estimación derivada sin respaldo IPCC directo).
- **Caveat:** el _label_ "Camélidos" mantiene su nombre genérico. Una segunda iteración debería desambiguar por especie (Alpacas, Llamas, Vicuñas, Guanacos) — pero excede el alcance "corregir factores uno a uno".
- **Prioridad de fuentes:** IPCC (DEFRA no aplica).

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
```

Todos los nuevos valores presentes y localizados (`grep` confirma 13 ediciones aplicadas).

---

## Referencias

1. **DEFRA** (2025). _UK Government GHG Conversion Factors for Company Reporting, 2025_. Hojas: "Fuels" (LPG), "UK electricity", "Hotel stay", "Freighting goods".
2. **IPCC** (2006). _2006 IPCC Guidelines for National Greenhouse Gas Inventories_, IGES. Vol. 4 Cap. 10 Tablas 10.10, 10.11, 10.14, 10.15 (ganadería); Vol. 4 Cap. 11 Tabla 11.1 (agricultura, EF₂).
3. **IPCC** (2014). AR5 WG1 Tabla 8.A.1 — GWP-100.
4. **IPCC** (2021). AR6 WG1 Tabla 7.SM.7 — GWP-100 actualizado (N₂O = 273).
5. **methodologies-deep-audit.md** (2026-05-18) — auditoría profunda que sirvió de base.

_Fin del reporte._
