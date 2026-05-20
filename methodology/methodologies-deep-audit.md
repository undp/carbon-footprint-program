# Auditoría profunda de `methodologies.json`

**Archivo auditado:** `packages/database/src/prisma/seeds/data/base/methodologies.json`
**Fecha de auditoría:** 2026-05-18
**Auditor:** Revisión técnica automatizada con contraste contra fuentes primarias
**Alcance:** Verificación numérica y estructural contra:

- Documentación interna del proyecto (`/Metodología/Metodología.html`, diagrama drawio).
- DEFRA UK Government GHG Conversion Factors 2025 (hojas `Fuels`, `Bioenergy`, `Refrigerant & other`, `UK electricity`, `Material use`, `Waste disposal`, `Water supply`, `Water treatment`, `Hotel stay`, `Business travel - air`, `Business travel - land`, `Freighting goods`, `Homeworking`).
- IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Volúmenes 2, 3, 4.
- IPCC 2019 Refinement to the 2006 IPCC Guidelines.
- IPCC AR5 WG1 (2014) Tabla 8.A.1 — GWP-100.
- IPCC AR6 WG1 (2021) Tabla 7.SM.7 — GWP-100 actualizado.
- Kool, A., Marinussen, M., & Blonk, H. (2012). _LCI data for the calculation tool Feedprint for greenhouse gas emissions of feed production and utilization_ (PDF en `/Metodología/Referencias Factores/Fertilizantes/`).
- Hoja de cálculo `Cálculo combustibles IPCC.xlsx` del proyecto.

---

## Resumen ejecutivo

La metodología `"Metodología inicial"` (`countryIsoCode: "PD"`, `regulation: "GHG Protocol"`, `version: "2004"`) tiene un grado de fidelidad alto respecto a las fuentes oficiales en la mayoría de los factores, pero presenta **siete errores de valor con impacto significativo** y **veinte inconsistencias estructurales** que comprometen la auditabilidad y la portabilidad a otros países.

### Hallazgos críticos de valor (con verificación contra fuentes primarias)

1. **Cabras (Ganadería)**: JSON 35.17 kg CO₂e/cab/año vs IPCC 2006 5.17 × GWP 30 = **155.1 kg CO₂e/cab/año**. El valor parece resultar de **sumar** GWP en lugar de multiplicar (5.17 + 30 = 35.17). Error 4.4× por debajo.
2. **Crianza de aves (Ganadería)**: JSON 9,810 kg CO₂e/cab/año vs IPCC 2006 0.02 × GWP 30 = **0.6 kg CO₂e/cab/año**. Error de magnitud 16,350×. Origen inexplicable.
3. **Vacas lecheras / Vacas de pastoreo (Ganadería)**: nomenclatura **invertida** respecto a IPCC 2006 Tabla 10.11 Latinoamérica (Dairy 72 + manure 1 = 73 kg CH₄/yr, Other Cattle 56 + 1 = 57). La metodología asignó "Vacas pastoreo" a 73 y "Vacas lecheras" a 57.
4. **Camélidos (Ganadería)**: factor 47.92 kg CH₄/yr corresponde a _Camels_ (dromedarios, 570 kg de peso). Los camélidos latinoamericanos son llamas y alpacas (65–130 kg). El factor correcto IPCC para _Alpacas_ es 8 kg CH₄/yr. Sobrevaloración ~6×.
5. **Agricultura — error de unidad N2O-N → N2O**: IPCC 2006 Tabla 11.1 publica EF₂ en **kg N₂O-N/ha**, no kg N₂O/ha. La conversión requiere multiplicar por 44/28. El JSON omite esta conversión, **subvalorando 36%**. Valor correcto temperado: 8 × (44/28) × 273 = 3,432 kg CO₂e/ha. JSON: 2,184.
6. **Electricidad**: JSON 0.5349 kg CO₂e/kWh. Fuente declarada `"DEFRA 2025"` da 0.17700. **La propia documentación interna del proyecto** (`Metodología.html`) registra 0.17489 como factor base. El valor 0.5349 no corresponde a DEFRA ni a la metodología interna; origen desconocido.
7. **GLP — factor kg/ton inconsistente**: JSON registra GLP con 2,603 kg/ton, que es el valor DEFRA 2025 para **LNG** (gas natural licuado), no para **LPG**. DEFRA 2025 LPG = 2,939 kg/ton. Los factores GLP en kg/m³ y kg/kWh sí corresponden a LPG.

### Hallazgos de valor de relevancia menor (asociados a la fuente metodológica original)

8. Factores marítimos y ferroviarios de carga **subvalorados 75–77%** vs DEFRA 2025 (Tren carga 0.00691 vs DEFRA 0.02779; Contenedor barco 0.00365 vs 0.01612; Granel barco 0.0008 vs 0.00353).
9. Hospedaje Italia: JSON 39 kg/noche vs DEFRA 2025 14.3 — error de copy-paste con Japón (39).
10. Hospedaje Colombia: JSON 17.4 vs DEFRA 2025 14.7 — probable valor de DEFRA 2024.
11. Duplicación "Perfloruro ciclopropano" con n-C₄F₁₀ (mismo GWP 9,200).
12. Typo "HFC-235cb" debería ser "HFC-236cb" (según DEFRA Refrigerant tab).

### Hallazgos estructurales críticos

- **Inconsistencia de GWP** entre subcategorías: refrigerantes usan AR5 sin feedback (CH₄=28), ganadería usa AR5 con feedback (CH₄=30), agricultura usa AR6 (N₂O=273). El sistema no documenta cuál GWP usa.
- **Aplicación incorrecta del factor IPCC EF₂**: este factor es exclusivamente para _organic crop and grassland soils_ (histosoles drenados); aplicarlo a "Cultivo general" en suelos minerales (mayoría de cultivos en Latinoamérica) **es un uso fuera del alcance del factor**. El factor correcto para suelos minerales es EF₁ = 0.01 kg N₂O-N/kg N aplicado, que depende de dosis de fertilizante, no de hectáreas.
- **Country-agnosticism violado** en fertilizantes: los valores 3.53, 0.54, 0.61 son específicos de la fila **South America** de Kool 2012 Tabla 21, no globales. Para deploy en otra región se requieren los valores regionales correspondientes (Asia 6.92, 1.66, 1.47; Norteamérica 4.00, 1.29, 1.02; Europa 5.62, 1.47, 1.36).
- **Mapeo erróneo a ISO 14064-1:2018**: el sistema declara 3 categorías cuando ISO requiere 6. Mezclar Scope 3 con ISO Cat 3–6 sin distinción impide auditoría ISO.
- **Cobertura Scope 3 GHG Protocol**: 8 de 15 categorías ausentes.

---

## Metodología de verificación

Los factores se contrastaron en tres niveles:

1. **Contra la documentación interna del proyecto** (`/Metodología/Metodología.html`, diagrama drawio con 1,695 celdas/factores).
2. **Contra los datasets DEFRA 2025 oficiales** extraídos de `DFRA_factors_simple.xlsx` y `DFRA_factors_extended.xlsx`.
3. **Contra los documentos primarios IPCC** (Vol. 4 Cap. 10 ganadería, Vol. 4 Cap. 11 agricultura, Vol. 3 procesos industriales) y Kool 2012 Tabla 21.

Para combustibles, la metodología interna del proyecto incluye tablas comparativas explícitas entre los valores DEFRA y los valores calculados desde IPCC (kg CO₂/TJ × LHV ÷ 277,778 para kWh). El sistema escogió DEFRA en todos los combustibles fósiles, por "simplicidad", según la nota metodológica.

---

# Sección 1 — Inconsistencias de valores

## 1.1 Potenciales de calentamiento global (GWP) — Emisiones fugitivas

Los valores corresponden a **IPCC AR5 GWP-100 sin retroalimentación climática** (Tabla 8.A.1 IPCC 2014), exactamente como los publica DEFRA 2025 en su hoja "Refrigerant & other".

### 1.1.1 Coincidencias verificadas

Todos los GWP de gases puros del Protocolo de Kyoto + NF₃ coinciden con DEFRA 2025 y con la documentación interna `Metodología.html` (ver tabla embebida en `methodology_values.txt` líneas 815–908):

| Gas                                                                                                                             | JSON    | DEFRA 2025 / AR5  | Estado |
| ------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------- | ------ |
| CO₂                                                                                                                             | 1       | 1                 | OK     |
| CH₄                                                                                                                             | 28      | 28                | OK     |
| N₂O                                                                                                                             | 265     | 265               | OK     |
| SF₆                                                                                                                             | 23,500  | 23,500            | OK     |
| NF₃                                                                                                                             | 16,100  | 16,100            | OK     |
| HFC-23 / 32 / 41 / 125 / 134 / 134a / 143 / 143a / 152 / 152a / 161 / 227ea / 236ea / 236fa / 245ca / 245fa / 365mfc / 43-10mee | (todos) | (todos coinciden) | OK     |
| PFC-14 / 116 / 218 / 318 / 3-1-10 / 4-1-12 / 5-1-14 / 9-1-18                                                                    | (todos) | (todos coinciden) | OK     |

### 1.1.2 Inconsistencias detectadas

- **"Perfloruro ciclopropano"** (presumiblemente perfluorociclopropano, c-C₃F₆): valor 9,200 idéntico al de PFC-3-1-10 (n-C₄F₁₀, también 9,200). **Duplicación**. AR5 no enumera c-C₃F₆ en Tabla 8.A.1; literaturas posteriores (Hodnebrog et al., 2013) reportan ~17,340 para c-C₃F₆. La asignación 9,200 al ciclopropano perfluorado es errónea. DEFRA 2025 no incluye este gas. Origen del error: aparece igualmente en la metodología interna del proyecto (línea 884 de `methodology_values.txt`), no es un artefacto del seed.

- **"HFC-235cb"** (JSON, valor 1,210): DEFRA 2025 lista este compuesto como **"HFC-236cb"** con valor 1,210. AR5 confirma HFC-236cb GWP-100 = 1,210. **Typo en el seed y en la documentación interna** ("HFC-235cb" no existe como nomenclatura química válida — el isómero correcto es 236cb).

- **Errores ortográficos en español**, presentes tanto en `methodologies.json` como en `Metodología.html`:
  - "Hexafloruro de azufre" → "Hexafluoruro de azufre"
  - "Perfloruro ciclopropano" → "Perfluorociclopropano"
  - "Trifloruro de nitrogeno" → "Trifluoruro de nitrógeno"

- **Gases reportables faltantes**: el JSON no incluye los siguientes gases que DEFRA 2025 sí publica:
  - HFO-1234yf, HFO-1234ze (alternativas modernas a HFC-134a con GWP ~1).
  - HCFC-22 (R-22, GWP 1,760), HCFC-123, HCFC-124, HCFC-141b, HCFC-142b — aún en uso legado en Latam.
  - Mezclas comerciales R-404A (3,943), R-407A/B/C/D/E/F, R-410A (1,924), R-417A, R-422D, R-438A, R-449A, R-507A, R-508A/B.
  - Éteres fluorados HFE-125, HFE-134, HFE-143a, etc.
  - Refrigerantes naturales R-290 (propano, GWP 0.06), R-600 (butano, 0.006), R-600A (isobutano, 3), R-744 (CO₂, 1), R-717 (NH₃, 0).

- **Versionado de GWP**: el JSON usa AR5. DEFRA 2025 sigue AR5. Pero el GHG Protocol y CSRD europeo recomiendan migrar a AR6 (CH₄ 27.0/29.8, N₂O 273, SF₆ 24,300, HFC-134a 1,530). No existe mecanismo en el esquema para versionar GWP.

**Referencias:** IPCC AR5 WG1 (2014) Table 8.A.1; DEFRA (2025) hoja "Refrigerant & other"; Hodnebrog, Ø. et al. (2013) _Rev. Geophys._ 51, 300–378.

---

## 1.2 Combustiones estacionarias

La metodología interna del proyecto compara explícitamente DEFRA vs IPCC para cada combustible y elige DEFRA "por simplicidad" (líneas 16–48 de `methodology_values.txt`). Los valores DEFRA 2025 verificados son:

### 1.2.1 Tabla comparativa verificada

| Combustible                            | JSON kg/ton | DEFRA 2025 | JSON kg/m³ o L | DEFRA 2025 | JSON kg/kWh | DEFRA 2025 Net CV | Estado                   |
| -------------------------------------- | ----------- | ---------- | -------------- | ---------- | ----------- | ----------------- | ------------------------ |
| Gas natural                            | 2,575       | 2,575.46   | 2.0            | 2.0667     | 0.20        | 0.20270           | OK (m³ redondeado a 2.0) |
| Diésel (avg biofuel blend)             | 3,087       | 3,087.94   | 2,570          | 2,570.82   | 0.25        | 0.25953           | OK                       |
| Gasolina (100% mineral)                | 3,154       | 3,154.08   | 2,339          | 2,339.84   | 0.25        | 0.25431           | OK                       |
| Queroseno (Burning oil)                | 3,165       | 3,165.04   | 2,540          | 2,540.16   | 0.25        | 0.25975           | OK                       |
| Fuel oil                               | 3,228       | 3,228.89   | 3,174          | 3,174.92   | 0.28        | 0.28523           | OK                       |
| Carbón industrial                      | 2,395       | 2,395.29   | —              | —          | 0.33        | 0.33944           | OK                       |
| Carbón electricidad                    | 2,225       | 2,225.22   | —              | —          | 0.33        | 0.33621           | OK                       |
| Coke (Petroleum coke)                  | 3,386       | 3,386.57   | —              | —          | 0.35        | 0.35887           | OK                       |
| Lubricantes                            | —           | 3,180.99   | 2,749          | 2,749.34   | —           | 0.28100           | OK (m³)                  |
| Combustible aviación (Aviation spirit) | —           | 3,193.69   | 2,331          | 2,331.16   | —           | 0.25666           | OK (m³)                  |

### 1.2.2 Inconsistencia crítica: GLP confundido con LNG en kg/ton

| Magnitud             | JSON GLP  | DEFRA LPG (real) | DEFRA LNG    | Veredicto                        |
| -------------------- | --------- | ---------------- | ------------ | -------------------------------- |
| kg/ton               | **2,603** | 2,939.36         | **2,603.30** | El JSON usa valor de LNG, no LPG |
| kg/m³ (=kg/L × 1000) | 1,557     | 1,557.13         | 1,177.97     | Correcto LPG                     |
| kg/kWh (Net CV)      | 0.23      | 0.23032          | 0.20489      | Correcto LPG                     |

La metodología interna (línea 32 de `methodology_values.txt`) muestra explícitamente esta confusión: lista "2603 / 1557 / 0.23" como el conjunto principal y al lado "2935 / 1554 / 0.22" como alternativa. El JSON quedó con el primer conjunto, que es internamente inconsistente porque mezcla LPG (m³, kWh) con LNG (ton).

**Impacto:** una organización que reporte consumo de GLP en toneladas obtiene emisiones 11.5% por debajo de las reales según DEFRA 2025.

### 1.2.3 Inconsistencia interna: biofuel blend para diésel pero 100% mineral para gasolina

DEFRA 2025 publica dos variantes para cada combustible de transporte: "average biofuel blend" (con biocomponente) y "100% mineral".

- **Diésel** JSON 3,087 = DEFRA "Diesel (average biofuel blend)".
- **Gasolina** JSON 3,154 = DEFRA "Petrol (100% mineral petrol)".

El JSON usa criterios opuestos para dos combustibles del mismo tipo, sin justificación documentada. DEFRA recomienda usar la variante "average biofuel blend" para "forecourt fuels" (combustibles de surtidor).

### 1.2.4 Combustibles biogénicos: lista parcial y unidad inconsistente

- **Biomasa**: declarada como valor de dimensión, **sin ningún factor** en `emissionFactors`. La metodología interna (línea 60) declara explícitamente: _"Las biomasa no se incluyen porque es complicado diferenciar y medir cuando son parte de un ciclo"_. Si la decisión es no incluirla, el valor `"Biomasa"` debe removerse de la lista de valores de dimensión para evitar selecciones vacías.
- **Biodiésel**: tiene factores en kg/GJ, kg/kg, kg/m³ — pero **no en kg/kWh ni kg/ton**.
- **Bioetanol**: tiene kg/GJ, kg/kg, kg/m³ — sin kg/kWh ni kg/ton.
- **Biogás**: solo kg/kWh y kg/ton — sin kg/GJ ni kg/m³.

DEFRA 2025 publica todos los biocombustibles con CO₂ biogénico **separado** en "Outside of Scopes" — el JSON no implementa esta separación, requerida por ISO 14064-1:2018 cláusula 5.2.5.

### 1.2.5 Base calorífica no declarada

DEFRA 2025 publica dos variantes para cada combustible: **Net CV** (Lower Heating Value, base europea) y **Gross CV** (Higher Heating Value, base norteamericana). La diferencia para gas natural es ~9.7% (0.20270 vs 0.18296 kg/kWh).

Los valores del JSON corresponden a **Net CV**, pero el archivo **no documenta** esta elección. Una organización que reporte consumo de gas en kWh a partir de su factura (típicamente Gross CV en países como Reino Unido) y aplique este factor sin convertir bases, **sobreestimará sus emisiones por 9.7%**.

**Referencias:** DEFRA (2025) hoja "Fuels"; nota metodológica DEFRA sobre Net CV vs Gross CV.

---

## 1.3 Combustiones móviles

Los factores cuando existen son consistentes con `Fuels` de DEFRA. Inconsistencias detectadas:

- **Nomenclatura inconsistente con estacionarias**:
  - "GLP" (estacionarias) ↔ "Gas licuado del petróleo" (móviles).
  - "Gasolina" (estacionarias) ↔ "Gasolina/Nafta" (móviles).
  - "Fuel oil" (estacionarias) ↔ "Fuel oil / Petróleo pesado" (móviles).
  - Esto rompe la posibilidad de hacer joins entre subcategorías y obliga a duplicar el dataset maestro de combustibles.
- **Cobertura de unidades parcial**: la dimensión `Combustible` declara 8 valores pero algunos no tienen factores para todas las unidades en `allowedMeasurementUnitsAbbreviations` (`kWh`, `MWh`, `L`, `m³`, `gal`, `g`, `kg`, `ton`).
- **Dimensión `Tipo` declarada pero sin uso**: la dimensión `Combustiones móviles (flota propia)_Tipo` enumera 6 vehículos (Auto, Camioneta, Avión, Motocicleta, Van, Camión) con `isRequired: false`; **ningún factor depende de esta dimensión** (todos los `dimensionValue1` son `null`). DEFRA sí distingue factores por tipo de vehículo en `Passenger vehicles` y `Freighting goods` (vans Clase I/II/III; HGV Rigid >3.5–7.5 ton; >7.5–17 ton; >17 ton; etc.).

---

## 1.4 Electricidad — Sistema nacional

| Fuente                                                    | Valor (kg CO₂e/kWh)                         |
| --------------------------------------------------------- | ------------------------------------------- |
| **JSON** `methodologies.json`                             | **0.5349499999999999**                      |
| **Metodología interna del proyecto** (`Metodología.html`) | **0.17489**                                 |
| **DEFRA UK 2025** (`UK electricity` tab)                  | **0.17700** (0.17489 CO₂ + 0.00211 CH₄/N₂O) |

**El JSON contradice la propia documentación interna del proyecto.** El valor 0.5349 no es DEFRA UK ni corresponde a ningún sistema interconectado latinoamericano publicado en 2024–2025:

| País / sistema            | Factor 2024 (aprox) |
| ------------------------- | ------------------- |
| Argentina (CAMMESA SADI)  | 0.354               |
| Brasil (MCTI SIN)         | 0.084               |
| Chile (SEC SEN)           | 0.402               |
| Colombia (UPME/XM)        | 0.165               |
| México (SEMARNAT/CRE SIN) | 0.453               |
| Perú (MINEM SEIN)         | 0.190               |
| Uruguay (UTE)             | 0.030               |

La representación con 14 dígitos decimales (`0.5349499999999999`) es un artefacto de serialización IEEE 754 binario; el valor entero pretendido es probablemente 0.53495.

**El JSON no recoge el factor DEFRA 2025 que su propia metodología documenta.** Origen probable: residuo de un seed antiguo o un valor demo no actualizado al refrescar a DEFRA 2025.

Adicionalmente, la dimensión `Sistema eléctrico` solo enumera `"Sistema nacional"` — impide modelar países con múltiples subsistemas (Brasil con Norte, Nordeste, Sudeste/Centro-Oeste, Sur; México con 9 regiones; Argentina pre-1992; Chile pre-2017 SIC/SING).

**Referencias:** DEFRA (2025) hoja "UK electricity"; CAMMESA (2024); MCTI Brasil (2024); SEC Chile (2024).

---

## 1.5 Ganadería — IPCC 2006 Vol. 4 Cap. 10

La metodología interna documenta que se usaron las Tablas 10.10, 10.14 y 10.15 del IPCC 2006, sumando fermentación entérica + manejo de estiércol. **Confirmado**: los valores base son correctos. El error está en la **conversión a CO₂e**.

### 1.5.1 Valores base IPCC verificados (Latin America, developing countries, temperate climate 15–25 °C)

| Animal                           | Entérico (10.10/10.11) | Manure CH₄ (10.14/10.15/10.16) | Total kg CH₄/cab/año | Doc. interna | JSON kg CO₂e | Factor GWP implícito   |
| -------------------------------- | ---------------------- | ------------------------------ | -------------------- | ------------ | ------------ | ---------------------- |
| Búfalos                          | 55                     | 1 (LAC)                        | 56                   | 56           | 1,680        | 30                     |
| Ovejas                           | 5                      | 0.15                           | 5.15                 | 5.15         | 154.5        | 30                     |
| Cabras                           | 5                      | 0.17                           | **5.17**             | **5.17**     | **35.17**    | **~6.8 (anómalo)**     |
| Camélidos (=Camels)              | 46                     | 1.92                           | 47.92                | 47.92        | 1,437.6      | 30                     |
| Caballos                         | 18                     | 1.64                           | 19.64                | 19.64        | 589.2        | 30                     |
| Mulas y burros                   | 10                     | 0.90                           | 10.9                 | 10.9         | 327          | 30                     |
| Ciervos                          | 20                     | 0.22                           | 20.22                | 20           | 600          | 30                     |
| Porcinos (developing)            | 1                      | 1 (LAC)                        | 2                    | 2            | 60           | 30                     |
| **Crianza de aves (developing)** | (0, insufficient)      | **0.02**                       | **0.02**             | **0.02**     | **9,810**    | **~490,500 (absurdo)** |
| Vacas lecheras (Dairy LAC)       | 72                     | 1                              | 73                   | **57** ⚠    | **1,710**    | 30 sobre 57            |
| Vacas de pastoreo (Other LAC)    | 56                     | 1                              | 57                   | **73** ⚠    | **2,190**    | 30 sobre 73            |

### 1.5.2 Hallazgos críticos

**Hallazgo 1 — Cabras (error de cálculo)**

```
Valor JSON:      35.17 kg CO₂e/cab/año
Valor correcto:  5.17 × 30 = 155.1 kg CO₂e/cab/año
Diferencia:      -77% (factor 4.4× por debajo)
Patrón:          35.17 = 5.17 + 30
```

El patrón sugiere que se **sumó** el GWP en lugar de **multiplicar** — un error de fórmula. El resto de los animales muestran multiplicación correcta por GWP=30.

**Hallazgo 2 — Crianza de aves (error de magnitud)**

```
Valor JSON:      9,810 kg CO₂e/cab/año
Valor correcto:  0.02 × 30 = 0.6 kg CO₂e/cab/año
Diferencia:      +1,635,000% (factor 16,350× por encima)
Origen:          inexplicable
```

Posibles hipótesis:

- Confusión con factor por 1,000 aves (entonces sería 9.81/cab/año — aún 16× por encima).
- Confusión con factor por tonelada de aves (broiler ~2 kg → ~20 kg CO₂e/ton — no encaja).
- Aplicación errónea de un EF de "Layers (wet)" (anaerobic lagoon system, developed): 1.4 kg CH₄/ave/año × GWP × (algún factor de número de aves por unidad).

IPCC 2006 Tabla 10.15 columna _Poultry — Developing countries — Temperate_: **0.02 kg CH₄/cabeza/año**. Aplicando GWP CH₄ = 30 da **0.6 kg CO₂e/cabeza/año**. Este es el valor que la documentación interna calcula (línea 167 de `methodology_values.txt`) — el JSON tiene un valor incompatible con esta metodología.

**Hallazgo 3 — Inversión Vacas lecheras / Vacas de pastoreo**

IPCC 2006 Tabla 10.11 fila _Latin America_:

| Cattle category                                     | Emission factor (kg CH₄/head/yr) |
| --------------------------------------------------- | -------------------------------- |
| **Dairy** (vacas lecheras)                          | 72                               |
| **Other Cattle** (otras: carne, pastoreo, novillos) | 56                               |

Adicionando manure CH₄ LAC (Tabla 10.14) = 1 kg CH₄/cab/año:

- Dairy + manure = **73** → corresponde semánticamente a **"Vacas lecheras"**
- Other + manure = **57** → corresponde semánticamente a **"Vacas de pastoreo"**

La documentación interna del proyecto y el JSON asignan estos valores **invertidos**:

- "Vacas de pastoreo" = 73 (debería ser 57).
- "Vacas lecheras" = 57 (debería ser 73).

Aplicando GWP 30:

- "Vacas de pastoreo" JSON = 2,190 (debería ser 1,710).
- "Vacas lecheras" JSON = 1,710 (debería ser 2,190).

**Impacto**: dependiendo de la composición del ganado de la organización reportante, este error puede sobreestimar o subestimar las emisiones por ~22%.

**Hallazgo 4 — "Camélidos" usa factor de Camels (dromedarios)**

IPCC 2006 Tabla 10.10:

- _Camels_ (camellos/dromedarios, peso vivo 570 kg): EF = 46 kg CH₄/cab/año.
- _Alpacas_ (peso vivo 65 kg): EF = 8 kg CH₄/cab/año.
- _Other (e.g., Llamas)_: "To be determined" (sin valor default).

Los camélidos sudamericanos económicamente relevantes son **llamas y alpacas**, no dromedarios. La metodología eligió el factor de Camels (46) — sobrevalorando aproximadamente **6×** el valor correcto para alpacas.

Aplicando GWP 30:

- Si el factor correcto es Alpacas (8 × 30 = 240 kg CO₂e/cab/año), el JSON 1,437.6 está sobrevalorado 6×.
- Para llamas (peso ~130 kg, escalando por ratio peso^0.75: 8 × (130/65)^0.75 = 8 × 1.68 = 13.5 kg CH₄/yr) → 13.5 × 30 = 405 kg CO₂e/cab/año.

**Hallazgo 5 — Inconsistencia de GWP entre subcategorías**

El factor GWP CH₄ implícito en Ganadería es **30** (IPCC AR5 con retroalimentación climática), mientras que en Emisiones Fugitivas se usa **28** (IPCC AR5 sin retroalimentación). La documentación interna no menciona esta elección. Esto es internamente inconsistente con DEFRA 2025, que usa 28 uniformemente.

**Referencias:** IPCC (2006) Vol. 4 Cap. 10 Tablas 10.10, 10.11, 10.14, 10.15, 10.16; IPCC AR5 WG1 (2014) Tabla 8.A.1 (CH₄ GWP-100: 28 sin feedback / 30 con feedback / 34 con feedback de carbono).

---

## 1.6 Agricultura — IPCC 2006 Vol. 4 Cap. 11 Tabla 11.1

### 1.6.1 Hallazgo crítico: omisión de la conversión N₂O-N → N₂O

La metodología interna documenta (línea 178 de `methodology_values.txt`):

```
Valor IPCC (kg N2O / ha) Clima: Templado/Tropical
Cultivo general    8/16
```

Pero IPCC 2006 Tabla 11.1 publica los valores en **kg N₂O-N/ha**, no kg N₂O/ha:

> EF₂ CG, Temp for temperate organic crop and grassland soils: 8 [kg N₂O-N ha⁻¹ yr⁻¹]
> EF₂ CG, Trop for tropical organic crop and grassland soils: 16 [kg N₂O-N ha⁻¹ yr⁻¹]

La conversión N₂O-N → N₂O requiere multiplicar por la razón de masas moleculares 44/28 = 1.5714.

Cálculo correcto:

- Temperado: 8 × (44/28) × 273 (AR6 N₂O) = **3,432 kg CO₂e/ha** — JSON tiene **2,184** (subvalorado 36%).
- Tropical: 16 × (44/28) × 273 = **6,864 kg CO₂e/ha** — JSON tiene **4,368** (subvalorado 36%).

Si se usa GWP AR5 N₂O = 265:

- Temperado: 8 × (44/28) × 265 = 3,331 — JSON sigue subvalorado 35%.

### 1.6.2 Hallazgo crítico: aplicación fuera del alcance del factor

La nota a Tabla 11.1 IPCC 2006 dice explícitamente:

> EF₂ CG, Temp: for temperate **organic** crop and grassland soils

EF₂ aplica exclusivamente a **histosoles drenados** (suelos orgánicos cultivados), no a suelos minerales. En Latinoamérica los histosoles representan <2% de la superficie cultivada. La gran mayoría de cultivos están en suelos minerales, para los cuales el factor IPCC aplicable es:

> EF₁: 0.01 kg N₂O-N / kg N aplicado (synthetic fertilizers, organic amendments, crop residues, N mineralised from mineral soil as a result of loss of soil carbon)

Este factor depende de la **dosis de N**, no de las hectáreas. El sistema no recoge la dosis de N como dimensión y aplica EF₂ a "Cultivo general" — un uso fuera del alcance del factor IPCC.

### 1.6.3 Inconsistencia de GWP

JSON 2,184 / 8 = 273 — el GWP implícito es **AR6 N₂O = 273**, mientras que Emisiones Fugitivas usa AR5 = 265 y Ganadería usa AR5 con feedback (30). Tres GWPs distintos para tres subcategorías, sin documentación.

**Referencias:** IPCC (2006) Vol. 4 Cap. 11 Sección 11.2.1, Tabla 11.1; IPCC AR6 WG1 (2021) Tabla 7.SM.7.

---

## 1.7 Fertilizantes — Kool et al. 2012 Tabla 21

### 1.7.1 Verificación de valores

La metodología interna cita correctamente la fuente: "Kool, A., Marinussen, M., & Blonk, H. (2012). _LCI data for the calculation tool Feedprint for greenhouse gas emissions of feed production and utilization_ (vol. 1, tabla 21)" — confirmado en el PDF `Fertilizer_production_D03.pdf` página 13.

**Tabla 21 de Kool 2012 (cradle-to-gate, kg CO₂eq/kg fertilizante)**:

| Región                        | N-fertilizer (kg N)  | P₂O₅ fertilizer       | K₂O fertilizer       |
| ----------------------------- | -------------------- | --------------------- | -------------------- |
| Global average                | 5.66 (3.42–8.43)     | 1.36 (0.14–2.15)      | 1.23 (0.36–1.91)     |
| Western Europe                | 5.62 (3.05–7.27)     | 1.47 (-0.29–2.49)     | 1.36 (-0.21–2.31)    |
| Eastern Europe (incl. Russia) | 6.87 (5.61–7.24)     | 1.57 (0.42–2.44)      | 1.45 (0.41–2.34)     |
| **South America**             | **3.53 (2.53–4.47)** | **0.54 (-0.06–0.85)** | **0.61 (0.40–0.83)** |
| North America                 | 4.00 (2.32–5.06)     | 1.29 (0.12–2.11)      | 1.02 (0.21–1.71)     |
| Asia                          | 6.92 (5.56–8.26)     | 1.66 (0.41–2.52)      | 1.47 (0.71–2.07)     |
| Australia                     | 3.06 (2.16–4.45)     | 1.14 (0.09–1.97)      | 1.63 (-0.06–3.22)    |

**Confirmado: el JSON usa exclusivamente los valores de la fila South America (3.53, 0.54, 0.61).**

### 1.7.2 Hallazgo crítico: violación de country-agnosticism

Los valores cargados en `methodologies.json` son específicos para **South America** (la fila Kool 2012 que asume principalmente Argentina y Brasil como productores y consumidores de N, P, K). Para un deploy en otra región:

- Asia: 6.92, 1.66, 1.47 (los valores South America serían 51% / 67% / 58% por debajo).
- Norteamérica: 4.00, 1.29, 1.02.
- Europa: 5.62, 1.47, 1.36.

El JSON no provee mecanismo de override por país ni declara que los valores son regionales. Cualquier país que despliegue el sistema fuera de Sudamérica obtendría subvaloración (con la excepción de Australia, que tiene valores similares).

### 1.7.3 Hallazgo crítico: descripción contradice la fuente

JSON description:

> "Emisiones derivadas del uso de fertilizantes en suelos productivos. Incluye gases liberados tras la aplicación de fertilizantes químicos u orgánicos."

Kool 2012 Tabla 21 (verificado en el PDF página 13):

> "The calculated carbon footprint of the average N, P₂O₅ and K₂O fertilizer use in different global regions. [...] Per kg N / Per kg P₂O₅ / Per kg K₂O. [...] **cradle to gate**"

Los valores 3.53, 0.54, 0.61 son emisiones de **producción** del fertilizante (extracción, síntesis, transporte hasta el agricultor), **NO** emisiones por aplicación al suelo (que serían N₂O directo e indirecto según IPCC EF₁ ≈ 4.17 kg CO₂e/kg N en suelo). La descripción del JSON es incorrecta.

Además, si la organización reporta tanto el factor de "Aplicación de fertilizantes" (Kool, producción) como el factor de "Cultivo general" (que indirectamente incluye N₂O por fertilización), está produciendo **doble conteo**.

### 1.7.4 Errores ortográficos

- "Potacio" → "Potasio" (presente tanto en JSON como en documentación interna).

**Referencias:** Kool, A., Marinussen, M., & Blonk, H. (2012). _LCI data for the calculation tool Feedprint for greenhouse gas emissions of feed production and utilization_. Blonk Consultants, Gouda, Tabla 21 página 13.

---

## 1.8 Procesos industriales — IPCC 2006 Vol. 3

### 1.8.1 Cemento, Acero, Vidrio, Cinc — verificación

| Categoría             | Valor JSON     | Valor IPCC 2006                     | Estado |
| --------------------- | -------------- | ----------------------------------- | ------ |
| Cemento: Clinker      | 0.52 kg CO₂/kg | 0.52 (Vol. 3 Cap. 2.2.1.1)          | OK     |
| Acero: BOF            | 1.46 kg CO₂/kg | 1.46 (Vol. 3 Cap. 4.2, Tabla 4.1)   | OK     |
| Acero: EAF            | 0.08           | 0.08                                | OK     |
| Acero: OHF            | 1.72           | 1.72                                | OK     |
| Acero: Default        | 1.06           | 1.06 (promedio mundial 2003)        | OK     |
| Cinc: Waelz Kiln      | 3.66 kg CO₂/kg | 3.66 (Vol. 3 Cap. 4.7, Tabla 4.24)  | OK     |
| Cinc: Pirometalúrgico | 0.43           | 0.43                                | OK     |
| Cinc: Default         | 1.72           | 1.72                                | OK     |
| Vidrio: Container     | 0.21 kg CO₂/kg | 0.21 (Vol. 3 Cap. 2.3.3, Tabla 2.6) | OK     |
| Vidrio: Flat          | 0.21           | 0.21                                | OK     |
| Vidrio: Fibra         | 0.19           | 0.19                                | OK     |
| Vidrio: Iluminaria    | 0.20           | 0.20                                | OK     |
| Vidrio: Tableware     | 0.10           | 0.10                                | OK     |

**Todos los procesos industriales presentes son numéricamente correctos.**

### 1.8.2 Cobertura de procesos: faltantes críticos para Latinoamérica

IPCC 2006 Vol. 3 enumera procesos con factores default disponibles que son económicamente relevantes en países LATAM:

| Proceso                                     | IPCC referencia                   | Países LATAM relevantes                                 |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| Aluminio primario (Söderberg, Prebake)      | Vol. 3 Cap. 4.4                   | Brasil, Argentina, Venezuela                            |
| Cobre (pirometalúrgico)                     | Vol. 3 Cap. 4.8                   | **Chile (1er productor mundial)**, Perú, México         |
| Refinación de petróleo                      | Vol. 3 Cap. 4.2.5 / Vol. 2 Cap. 4 | Brasil, Argentina, México, Venezuela, Colombia, Ecuador |
| Ácido nítrico                               | Vol. 3 Cap. 3.3                   | Brasil, Argentina, Chile                                |
| Ácido adípico                               | Vol. 3 Cap. 3.4                   | (limitado)                                              |
| Petroquímica (etileno, propileno, amoníaco) | Vol. 3 Cap. 3.9                   | Brasil, Argentina, México, Venezuela                    |
| Caliza y dolomita                           | Vol. 3 Cap. 2.5                   | Múltiples (cemento)                                     |

Ninguno está en el JSON. Para Chile específicamente, la ausencia del proceso de cobre limita severamente la utilidad de la metodología.

**Referencias:** IPCC (2006) Vol. 3: Industrial Processes and Product Use.

---

## 1.9 Viajes de negocios — Estadía (DEFRA 2025 "Hotel stay")

Verificación contra hoja "Hotel stay" de DEFRA 2025:

| País              | JSON     | DEFRA 2025 | Estado                     |
| ----------------- | -------- | ---------- | -------------------------- |
| Alemania          | 13.2     | 13.2       | OK                         |
| Australia         | 35.0     | 35.0       | OK                         |
| Brasil ("Brazil") | 8.7      | 8.7        | OK                         |
| Chile             | 27.6     | 27.6       | OK                         |
| China             | 53.5     | 53.5       | OK                         |
| **Colombia**      | **17.4** | **14.7**   | DISCREPANCIA               |
| Costa Rica        | 4.7      | 4.7        | OK                         |
| EE.UU.            | 16.1     | 16.1       | OK                         |
| España            | 7.0      | 7.0        | OK                         |
| Holanda           | 14.8     | 14.8       | OK                         |
| Hong Kong         | 51.5     | 51.5       | OK                         |
| India             | 58.9     | 58.9       | OK                         |
| Indonesia         | 62.7     | 62.7       | OK                         |
| **Italia**        | **39.0** | **14.3**   | DISCREPANCIA mayor (+173%) |
| Japón             | 39.0     | 39.0       | OK                         |
| México            | 19.3     | 19.3       | OK                         |
| Tailandia         | 43.4     | 43.4       | OK                         |
| Turquía           | 32.1     | 32.1       | OK                         |
| Vietnam           | 38.5     | 38.5       | OK                         |

### 1.9.1 Hallazgo: Italia

El valor 39 está asignado idéntico a Japón. **Probable error de copy-paste** en la metodología documentada (que también muestra Italia con 39, línea 423 de `methodology_values.txt`). DEFRA 2025 publica Italia 14.3 kg CO₂e/noche.

### 1.9.2 Hallazgo: Colombia

JSON 17.4 vs DEFRA 2025 14.7 (+18.4%). Posible origen: valor de DEFRA 2024 (Colombia subió en versiones anteriores). Sin documentación de fecha, no se puede confirmar.

### 1.9.3 Categorías inventadas

- "Otro país Latam" 27.6 y "Otro país" 106.4 no existen en DEFRA. La metodología interna documenta la justificación: _"Para el default de Latam, se escogió el con valor más alto dentro de los países de Latam. Para el default de otro país se consideró el más alto excluyendo a Maldivas"_ (línea 466 de `methodology_values.txt`). Esto es razonable como heurística pero debería documentarse en el archivo seed.

### 1.9.4 Unidad ambigua

JSON declara unidad `"pieza arre"` (pieza de arrendamiento). DEFRA usa `Room per night`. Convendría normalizar a `noche-habitación` o `room-night`.

**Referencias:** DEFRA (2025) hoja "Hotel stay".

---

## 1.10 Viajes de negocios — Traslado (DEFRA 2025)

| Modo                        | JSON kg CO₂e/km | DEFRA 2025 con RF        | DEFRA 2025 sin RF | Estado      |
| --------------------------- | --------------- | ------------------------ | ----------------- | ----------- |
| Auto (Average car)          | 0.173           | 0.17304                  | —                 | OK          |
| Taxi (Regular passenger.km) | 0.148           | 0.14861                  | —                 | OK          |
| Bus (Average local)         | 0.1038          | 0.10385                  | —                 | OK          |
| Tren (National rail)        | 0.0354          | 0.03546                  | —                 | OK          |
| Avión Short haul Economy    | 0.1257          | 0.12576                  | 0.07435           | OK (con RF) |
| Avión Short haul Business   | 0.1886          | 0.18863                  | 0.11151           | OK (con RF) |
| Avión Medium haul Economy   | 0.117           | (≈Long haul UK 0.11704)  | 0.06926           | OK (con RF) |
| Avión Medium haul Business  | 0.3394          | 0.33940                  | 0.20083           | OK (con RF) |
| Avión Long haul Economy     | 0.1091          | (≈International 0.10916) | 0.06449           | OK (con RF) |
| Avión Long haul Business    | 0.3165          | 0.31656                  | 0.18701           | OK (con RF) |

**Conclusión: todos los factores de traslado corresponden a DEFRA 2025 con Radiative Forcing.**

### 1.10.1 Mapeo de categorías DEFRA → JSON

| JSON                  | DEFRA 2025                      |
| --------------------- | ------------------------------- |
| Short haul (<3 hrs)   | "Short-haul, to/from UK"        |
| Medium haul (3–6 hrs) | "Long-haul, to/from UK"         |
| Long haul (>6 hrs)    | "International, to/from non-UK" |

Este mapeo es **semánticamente impreciso**: DEFRA distingue por origen/destino UK, no por duración. Una organización en Chile que vuele a Madrid (vuelo ~13 hrs) usaría el factor "International" según DEFRA — coincide con "Long haul (>6 hrs)" del JSON. Pero un vuelo Buenos Aires–Bogotá (~6 hrs) caería en "Medium haul" del JSON, mientras DEFRA lo categorizaría como "International". El sistema es consistente con DEFRA solo de manera circunstancial.

### 1.10.2 Falta declaración de RF

DEFRA publica las dos variantes (con y sin Radiative Forcing). El JSON usa "con RF" pero no lo declara. Esto importa porque algunas regulaciones requieren reportar también la variante sin RF (DEFRA Methodology Paper).

**Referencias:** DEFRA (2025) hoja "Business travel - air"; Lee, D.S. et al. (2021) _Atmos. Environ._ 244, 117834.

---

## 1.11 Transporte y distribución de carga (Cat 4 + Cat 9)

Las dos subcategorías "aguas arriba" y "aguas abajo" tienen **factores idénticos**.

| Modo                                               | JSON                  | DEFRA 2025 (verificado)              | Diferencia                  |
| -------------------------------------------------- | --------------------- | ------------------------------------ | --------------------------- |
| Camión no refrigerado (HGV all average vehicle.km) | 0.2115 kg/km          | ≈0.21 (HGV all)                      | OK                          |
| Camión refrigerado                                 | 0.2482                | ≈0.25                                | OK                          |
| Van con motor a combustión (Average up to 3.5 ton) | 0.06183               | 0.06183 (vehicle.km)                 | OK                          |
| Van eléctrica                                      | 0.03758               | 0.03758 (UK grid mix)                | OK con UK grid (limitación) |
| **Tren de carga**                                  | **0.00691 kg/km-ton** | **0.02779 kg/tonne.km**              | **-75% (DISCREPANCIA)**     |
| **Contenedores por barco**                         | **0.00365**           | **0.01612 (Container ship average)** | **-77% (DISCREPANCIA)**     |
| **Granel por barco**                               | **0.0008**            | **0.00353 (Bulk carrier average)**   | **-77% (DISCREPANCIA)**     |
| Avión Short haul (<2500 km)                        | 0.2051 kg/km-ton      | 1.27835 (con RF) / 0.75539 (sin RF)  | DISCREPANCIA                |
| Avión Medium haul                                  | 0.1351                | 0.89939 (con RF)                     | DISCREPANCIA                |
| Avión Long haul                                    | 0.1351                | 0.89939 (con RF)                     | DISCREPANCIA                |

### 1.11.1 Hallazgos

1. **Factores marítimos y ferroviarios sistemáticamente subvalorados ~75–77%**. La discrepancia es consistente con que el JSON tomó solo una fracción del factor DEFRA, posiblemente un componente WTT (Well-to-Tank) en lugar del factor WTW (Well-to-Wheel) completo. **Confirmado: la metodología interna del proyecto registra los mismos valores erróneos** (línea 470 de `methodology_values.txt`), por lo que el error está en la fuente original, no en el seed loader.

2. **Factores aéreos de carga divergen significativamente** de DEFRA 2025. El JSON usa 0.2051 / 0.1351, mientras DEFRA da 1.27 / 0.89 con RF. Posible que el JSON use el componente WTT o un dataset distinto al actual DEFRA "Freighting goods".

3. **Van eléctrica con factor UK**: el factor 0.03758 asume mix eléctrico UK 2025 (0.177 kg CO₂e/kWh). Para países con mix más limpio (Brasil 0.084) el factor sería ~0.018; para mix más sucio (México 0.453) sería ~0.097. Sin parametrización por país, el factor es inadecuado.

**Referencias:** DEFRA (2025) hojas "Freighting goods" y "WTT - delivery vehicles & freight".

---

## 1.12 Disposición de residuos sólidos — VERIFICADO CORRECTO

DEFRA 2025 hoja "Waste disposal" publica el factor **uniforme 4.6857 kg CO₂e/ton** para Open-loop, Closed-loop e Incineration with energy recovery — **diferente al supuesto en versiones anteriores de DEFRA donde cada material tenía factor de reciclaje específico**.

Los valores `Composting` = 8.9831 y `Landfill` por material varían:

| Material × Destino                                  | JSON  | DEFRA 2025                               | Estado |
| --------------------------------------------------- | ----- | ---------------------------------------- | ------ |
| Papel — Landfill                                    | 1,164 | 1,164.49                                 | OK     |
| Madera — Landfill                                   | 925   | 925.34                                   | OK     |
| Materiales construcción — Landfill                  | 1.26  | 1.26 (Aggregates)                        | OK     |
| Vidrio — Landfill                                   | 8.9   | 8.98                                     | OK     |
| Metal — Landfill                                    | 8.9   | 8.98                                     | OK     |
| Plástico — Landfill                                 | 8.9   | 8.98                                     | OK     |
| Items electrónicos — Landfill                       | 8.9   | 8.98 (WEEE)                              | OK     |
| Ropa — Landfill                                     | 496   | 496.78                                   | OK     |
| Residuos casa — Landfill                            | 497   | 497.24 (Household residual)              | OK     |
| Residuos comerciales — Landfill                     | 520   | 520.53                                   | OK     |
| (cualquier material) — Reciclaje (Open/Closed-loop) | 4.68  | 4.6857                                   | OK     |
| (cualquier material) — Incineración                 | 4.68  | 4.6857 (Incineration w/ energy recovery) | OK     |

**Conclusión:** los factores de Disposición de residuos sólidos son numéricamente correctos.

### 1.12.1 Observación menor

DEFRA "Wood × Composting" y "Wood × Incineration" tienen valores 8.98 y 4.69 respectivamente; el JSON solo tiene 4.68 para Wood × Incineration (correcto) y carece de la opción Composting.

**Referencias:** DEFRA (2025) hoja "Waste disposal".

---

## 1.13 Productos comprados — VERIFICADO CORRECTO

Verificación contra DEFRA 2025 hoja "Material use":

| Material × Destino                         | JSON   | DEFRA 2025                    | Estado |
| ------------------------------------------ | ------ | ----------------------------- | ------ |
| Items electrónicos grandes — Primera mano  | 3,267  | 3,267 (Electrical - large)    | OK     |
| Items electrónicos pequeños — Primera mano | 5,647  | 5,647.95 (Electrical - small) | OK     |
| Pilas no recargables — Primera mano        | 4,633  | 4,633.48 (Alkaline)           | OK     |
| Pilas recargables — Primera mano           | 28,380 | 28,380 (NiMh)                 | OK     |
| Madera — Primera mano                      | 269    | 269.50                        | OK     |
| Madera — Reutilizado                       | 38     | 38.54                         | OK     |
| Materiales construcción — Primera mano     | 75     | 75.01 (Average construction)  | OK     |
| Metal — Primera mano                       | 5,114  | 5,114.62 (Mixed cans)         | OK     |
| Metal — Con material reciclado             | 1,525  | 1,525.52                      | OK     |
| Papel y cartón — Primera mano              | 1,288  | 1,288.50                      | OK     |
| Papel y cartón — Con material reciclado    | 1,068  | 1,068.77                      | OK     |
| Plástico — Primera mano                    | 3,172  | 3,172.50 (Average plastics)   | OK     |
| Plástico — Con material reciclado          | 1,575  | 1,575.39                      | OK     |
| Ruedas — Primera mano                      | 3,335  | 3,335.57 (Tyres)              | OK     |
| Ruedas — Reutilizado                       | 731    | 731.22                        | OK     |
| Ropa — Primera mano                        | 22,310 | 22,310 (Clothing)             | OK     |
| Ropa — Reutilizado                         | 152    | 152.25                        | OK     |
| Vidrio — Primera mano                      | 1,402  | 1,402.76                      | OK     |
| Vidrio — Con material reciclado            | 823    | 823.19                        | OK     |

**Conclusión:** todos los factores presentes son correctos vs DEFRA 2025.

### 1.13.1 Granularidad: "Metal" como factor agregado

DEFRA 2025 distingue:

- Aluminium cans and foil: 9,115.90 kg CO₂e/ton.
- Mixed cans: 5,114.62.
- Scrap metal: 3,473.12.
- Steel cans: 2,863.90.

El JSON colapsa todos en "Metal" = 5,114 (factor de mixed cans). Para una empresa que reporta consumo predominantemente de aluminio, este factor subvalora 44%. Para acero, sobrevalora 79%.

Lo mismo aplica a "Plástico" (genérico 3,172, pero DEFRA distingue HDPE 3,095, LDPE 2,965, PET 3,864, PP 2,577, PS 4,377, PVC 2,945).

### 1.13.2 Combinaciones Material × Destino sin factor

51% de las combinaciones declaradas no tienen factor. Algunas son genuinamente no aplicables (e.g., "Pilas recargables × Con material reciclado" no es categoría comercial), otras sí existen en DEFRA (e.g., "Madera × Reciclaje" = 4.6857). La metodología interna documenta: _"Hay materiales que no tienen valor en ciertos formatos de compra, porque no se suelen comprarse de dicha forma"_ (línea 597 de `methodology_values.txt`) — razonable, pero deberían declararse explícitamente con `null` o flag `not_applicable`.

**Referencias:** DEFRA (2025) hoja "Material use".

---

## 1.14 Consumo y tratamiento de agua — VERIFICADO CORRECTO

| Concepto                         | JSON              | DEFRA 2025                |
| -------------------------------- | ----------------- | ------------------------- |
| Consumo de agua                  | 0.1913 kg CO₂e/m³ | 0.1913 (Water supply)     |
| Agua dispuesta al alcantarillado | 0.1708            | 0.17088 (Water treatment) |

**Ambos factores son exactos respecto a DEFRA 2025.**

**Referencias:** DEFRA (2025) hojas "Water supply" y "Water treatment".

---

## 1.15 Combustibles documentación interna IPCC — calculados pero no usados

El proyecto incluye `Cálculo combustibles IPCC.xlsx` con cálculos derivados de IPCC 2006 Vol. 2 Cap. 1 Tabla 1.2 (factores en kg gas/TJ) × LHV × densidad. Estos cálculos están en la documentación interna pero **no se usaron en el JSON final** (que usa DEFRA). Ejemplo Gas natural:

| Fuente              | kg/ton   | kg/m³  | kg/kWh  |
| ------------------- | -------- | ------ | ------- |
| IPCC 2006 calculado | 2,692.85 | 1.8118 | 0.20196 |
| DEFRA 2025 (JSON)   | 2,575    | 2.0    | 0.20    |

La decisión documentada de usar DEFRA es razonable, pero introduce dependencia del Reino Unido. Para un país con datos nacionales propios, podría sustituirse por cálculos IPCC con LHV nacionales.

---

# Sección 2 — Inconsistencias estructurales

## 2.1 Marco normativo y versión

`regulation: "GHG Protocol"`, `version: "2004"` es incompleto:

- El GHG Protocol no provee factores de emisión, solo el marco contable.
- Versionado real de los estándares aplicables:
  - GHG Protocol Corporate Standard (revised 2004).
  - GHG Protocol Scope 2 Guidance (2015) — relevante para electricidad.
  - GHG Protocol Scope 3 Standard (2011) — relevante para todas las subcategorías de "Otras emisiones indirectas".
  - ISO 14064-1:2018 — relevante para auditabilidad.

Las fuentes de los factores son DEFRA 2025, IPCC 2006 (procesos), IPCC 2006/2019 Refinement (ganadería, agricultura), Kool 2012 (fertilizantes). Ninguna de estas es "GHG Protocol".

**Recomendación**: convertir `regulation` en objeto:

```json
"frameworks": {
  "primary": "GHG Protocol Corporate Standard",
  "scope2": "GHG Protocol Scope 2 Guidance 2015",
  "scope3": "GHG Protocol Scope 3 Standard 2011",
  "iso": "ISO 14064-1:2018"
},
"gwp_basis": "IPCC AR5 GWP-100 (no climate carbon feedback)",
"factor_sources": ["DEFRA 2025", "IPCC 2006 Guidelines", "IPCC 2019 Refinement", "Kool 2012"]
```

---

## 2.2 Mapeo ISO 14064-1:2018 vs GHG Protocol Scopes

El sistema organiza emisiones en 3 categorías mezclando ambas nomenclaturas en `synonyms`:

- "Emisiones directas" — `CATEGORIA 1 / ALCANCE 1`.
- "Emisiones indirectas por energías importadas" — `CATEGORIA 2 / ALCANCE 2`.
- "Otras emisiones indirectas" — `CATEGORIAS 3, 4, 5, y 6 / ALCANCE 3`.

ISO 14064-1:2018 cláusula 5.2 define **6 categorías**, no 3:

| ISO 14064 | Nombre                                   | Mapping GHG Protocol           |
| --------- | ---------------------------------------- | ------------------------------ |
| 1         | Directas                                 | Scope 1                        |
| 2         | Indirectas por energía importada         | Scope 2                        |
| 3         | Indirectas por transporte                | Scope 3 Cat 4, 6, 7, 9         |
| 4         | Indirectas por productos usados          | Scope 3 Cat 1, 2, 8            |
| 5         | Indirectas por uso de productos vendidos | Scope 3 Cat 10, 11, 12, 13, 14 |
| 6         | Otras                                    | Scope 3 Cat 3, 5, 15           |

Mezclar Cat 3–6 ISO en un único "Otras emisiones indirectas" impide producir reporting ISO 14064 conforme. Una organización que busque certificación ISO 14064-3 no podrá usar el dataset tal cual.

---

## 2.3 Cobertura del Scope 3 GHG Protocol (2011)

El GHG Protocol Scope 3 Standard define 15 categorías. El JSON cubre 7 (algunas vacías):

| GHGP Cat | Nombre                                     | Presente                      | Estado                      |
| -------- | ------------------------------------------ | ----------------------------- | --------------------------- |
| 1        | Purchased goods and services               | Sí (parcial: solo materiales) | OK parcial                  |
| 2        | Capital goods                              | **No**                        | Faltante                    |
| 3        | Fuel- and energy-related activities        | **No**                        | Faltante                    |
| 4        | Upstream transportation and distribution   | Sí                            | OK (con discrepancia §1.11) |
| 5        | Waste generated in operations              | Sí                            | OK                          |
| 6        | Business travel                            | Sí                            | OK                          |
| 7        | Employee commuting                         | Sí pero VACÍA                 | Sin factores                |
| 8        | Upstream leased assets                     | **No**                        | Faltante                    |
| 9        | Downstream transportation and distribution | Sí                            | OK                          |
| 10       | Processing of sold products                | **No**                        | Faltante                    |
| 11       | Use of sold products                       | Sí pero VACÍA                 | Sin factores                |
| 12       | End-of-life treatment of sold products     | **No**                        | Faltante                    |
| 13       | Downstream leased assets                   | **No**                        | Faltante                    |
| 14       | Franchises                                 | **No**                        | Faltante                    |
| 15       | Investments                                | **No**                        | Faltante                    |

Cobertura efectiva: **5 de 15 categorías Scope 3 con factores**.

---

## 2.4 Documentación de fuentes (`source`)

El campo `source` es texto libre con cuatro valores distintos: `"DEFRA 2025"`, `"IPCC"`, `"Kool, A."`, sin información estructurada. Problemas:

- **Versión de IPCC ausente**: ¿2006? ¿2019 Refinement? ¿AR5? ¿AR6? Para ganadería, la metodología interna especifica "vol. 4, cap. 10, 2006" — esa información no está en el JSON.
- **Dataset DEFRA ausente**: DEFRA 2025 publica ~30 hojas; el factor depende de la hoja. El sistema usa "Fuels", "Refrigerant & other", "UK electricity", "Hotel stay", "Material use", "Waste disposal", "Water supply", "Water treatment", "Business travel - air", "Business travel - land", "Freighting goods" — pero el JSON solo dice "DEFRA 2025".
- **Referencia Kool incompleta**: `"Kool, A."`. La cita correcta es Kool, Marinussen, & Blonk (2012), _LCI data for the calculation tool Feedprint..._, Blonk Consultants, Tabla 21.
- **Sin URL/DOI** para auditoría automatizada.
- **Sin granularidad de tabla/página**: ISO 14064-3:2019 requiere poder localizar el factor en el documento fuente.

**Recomendación**: estructurar el campo `source`:

```json
"source": {
  "publisher": "IPCC",
  "title": "2006 IPCC Guidelines for National Greenhouse Gas Inventories",
  "volume": 4, "chapter": 10,
  "table": "10.10 + 10.14",
  "region": "Latin America, developing countries, temperate climate",
  "url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html"
}
```

---

## 2.5 Versionado de GWP — INCONSISTENCIA INTERNA

El sistema usa **tres GWPs distintos** sin documentación:

| Subcategoría                        | GWP CH₄ implícito | GWP N₂O implícito | Versión          |
| ----------------------------------- | ----------------- | ----------------- | ---------------- |
| Emisiones fugitivas (refrigerantes) | 28                | 265               | AR5 sin feedback |
| Ganadería                           | 30                | —                 | AR5 con feedback |
| Agricultura                         | —                 | 273               | AR6              |

DEFRA 2025 usa **AR5 sin feedback uniformemente** (CH₄=28, N₂O=265). El sistema diverge de DEFRA en ganadería y agricultura sin justificación.

**Recomendación**: declarar `gwp_basis` a nivel de metodología y, opcionalmente, por factor para permitir AR5 vs AR6 y con/sin feedback.

---

## 2.6 Tratamiento de emisiones biogénicas

ISO 14064-1:2018 cláusula 5.2.5 y GHG Protocol Corporate Standard cláusula 4 requieren **reportar separadamente las emisiones de CO₂ biogénico**. El sistema:

- Mezcla biodiésel, bioetanol, biogás como factor único (sin separación CO₂ biogénico / fósil).
- Excluye biomasa completamente (declarada como valor pero sin factor).

DEFRA 2025 publica todos los biocombustibles con CO₂ biogénico en hoja "Outside of Scopes" — el JSON no implementa esta separación.

---

## 2.7 Base calorífica (Net CV vs Gross CV)

Confirmado: el sistema usa Net CV. No está declarado en ningún campo. Una organización con datos en Gross CV (Reino Unido, facturas de gas) que aplique estos factores sin convertir, sobreestima ~10% para gas natural.

**Recomendación**: agregar `heating_value_basis: "net" | "gross"` por factor o por subcategoría.

---

## 2.8 Radiative Forcing aéreo

Confirmado: el sistema usa factores DEFRA "con RF" (multiplicador 1.9× según Lee et al., 2021). No está declarado.

**Recomendación**: agregar `includes_radiative_forcing: boolean` a factores aéreos.

---

## 2.9 Granularidad de dimensiones declaradas pero no usadas

- **`Combustiones estacionarias_Tipo`**: 63 valores (Caldera, Horno, Generador, etc.) con `isRequired: false`, ningún factor depende de esta dimensión (todos `dimensionValue1 = null`). Ruido en el modelo.
- **`Combustiones móviles_Tipo`**: 6 valores (Auto, Camión, Avión, etc.), también sin factores asociados.

DEFRA sí distingue factores por tipo de vehículo (HGV por tonelaje y carga, Vans Clase I/II/III, etc.). La metodología interna del proyecto reconoce esta carencia: _"Si se quiere un nivel más específico (Ej: Detallar si es un auto, bus, camión, etc) no es complejo y se puede incluir con DFRA"_ (línea 49 de `methodology_values.txt`).

**Recomendación**: o bien remover la dimensión, o bien poblarla con factores diferenciados.

---

## 2.10 Country-agnosticism — VIOLACIONES DOCUMENTADAS

| Violación                                                                             | Impacto                                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Electricidad: solo `"Sistema nacional"` (factor 0.5349 sin documentar)                | No modela subsistemas; valor no DEFRA ni LATAM                     |
| Fertilizantes: usa Kool 2012 fila **South America**                                   | Países fuera de Sudamérica obtienen valores incorrectos            |
| Hospedaje: 19 países hardcoded + "Otro país Latam" + "Otro país" con valores DEFRA UK | Cada país desplegando debe revisar manualmente                     |
| Refrigerantes: lista de gases puros del Kyoto, sin mezclas comerciales modernas       | Falta R-410A, R-407C, R-404A, HFOs, refrigerantes naturales        |
| Procesos industriales: cinc, cemento, vidrio, acero                                   | Falta aluminio, cobre, refinería, ácidos — críticos en LATAM       |
| Ganadería: developing countries default temperature 15–25°C                           | Climas frío/cálido requieren factores distintos (Tabla 10.14 IPCC) |
| Transporte van eléctrica: 0.03758 con mix UK                                          | Cada país debería tener su mix                                     |

**Recomendación**: introducir mecanismo de override por país. La metodología base contiene defaults globales; cada país despliega un overlay seed (`packages/database/src/prisma/seeds/data/country/<XX>/methodologies.json`) que sobrescribe o agrega factores específicos.

---

## 2.11 Refrigerantes faltantes

Lista de gases que DEFRA 2025 publica y el sistema no incluye:

- **HFOs**: HFO-1234yf, HFO-1234ze (R-1234yf, R-1234ze — GWP < 1; ya extendidos en automóviles y HVAC).
- **HCFCs legados**: HCFC-22 (R-22, GWP 1,760), HCFC-123 (79), HCFC-141b (782), HCFC-142b (1,980). Aún presentes en equipos antiguos en LATAM bajo cronograma Montreal.
- **Mezclas comerciales** (DEFRA 2025 publica > 80 mezclas, con GWP ponderado):
  - R-404A (3,943), R-407A (1,923), R-407B (2,547), R-407C (1,624), R-407F (1,674).
  - R-410A (1,924), R-410B (2,048).
  - R-417A (2,127), R-422D (2,473), R-438A (2,059), R-449A.
  - R-507A (3,985), R-508A (11,607), R-508B (11,698).
- **Refrigerantes naturales**:
  - R-744 (CO₂, GWP 1).
  - R-717 (NH₃, GWP 0).
  - R-290 (propano, GWP 0.06).
  - R-600 (butano, 0.006), R-600A (isobutano, 3).
- **Éteres fluorados**: HFE-125, HFE-134, HFE-143a, HFE-245fa2, HFE-347mcc3, etc.

DEFRA 2025 también provee GWPs para refrigerantes del Protocolo de Montreal (no Kyoto), que el JSON omite — relevante porque equipos pre-2020 aún los usan.

---

## 2.12 Procesos industriales faltantes

Ver §1.8.2. Para Latinoamérica son críticos:

- **Aluminio** (Brasil, Argentina, Venezuela).
- **Cobre** (Chile como 1er productor mundial, Perú, México).
- **Refinación de petróleo** (Brasil, México, Argentina, Venezuela, Colombia, Ecuador).
- **Ácidos nítrico y adípico** (Brasil, Argentina).
- **Petroquímica**.

---

## 2.13 Sumideros / remociones

ISO 14064-1:2018 cláusula 5.2 explícitamente requiere reportar removals separados de emisiones. El sistema no contempla:

- Forestación / reforestación.
- Captura y almacenamiento de CO₂ (CCS).
- Biocarbón (biochar).
- Gestión de suelos con secuestro.

**Recomendación**: agregar categoría "Remociones" con factores negativos o flag `is_removal: true`.

---

## 2.14 Combinaciones de dimensiones faltantes

Cuando una subcategoría declara dimensiones `isRequired: true`, el producto cartesiano debe tener un factor (o declararse explícitamente no aplicable).

- **Productos comprados**: 13 materiales × 3 destinos = 39 combinaciones. Solo 19 tienen factor (49%). Algunas combinaciones genuinamente no aplican (la metodología interna lo justifica), pero el JSON no las marca.
- **Disposición de residuos sólidos**: 10 × 3 = 30. 26 tienen factor (87%).
- **Combustiones estacionarias**: dimensión `Tipo` opcional pero declarada (ver §2.9).

**Recomendación**: validar matriz cartesiana en el seed loader y marcar combinaciones inaplicables con `{ "value": null, "applicable": false, "reason": "Material no se comercializa en este formato" }`.

---

## 2.15 Errores de nomenclatura y ortografía

**En la metodología fuente y propagados al JSON** (no son introducidos por el seed loader):

| Texto archivo             | Texto correcto                       |
| ------------------------- | ------------------------------------ |
| "Hexafloruro de azufre"   | "Hexafluoruro de azufre"             |
| "Perfloruro ciclopropano" | "Perfluorociclopropano"              |
| "Trifloruro de nitrogeno" | "Trifluoruro de nitrógeno"           |
| "Potacio (K2O)"           | "Potasio (K₂O)"                      |
| "Brazil"                  | "Brasil"                             |
| "EEUU"                    | "Estados Unidos" / ISO 3166 "US"     |
| "Vidrio de iluminaria"    | "Vidrio de iluminación"              |
| "HFC-235cb"               | "HFC-236cb" (compuesto químico real) |
| "pieza arre"              | "noche-habitación" / "room-night"    |
| "cant anim"               | "cabeza" / "animal/año"              |

**Inconsistencias entre subcategorías (mismo concepto, distintos nombres)**:

| Subcategoría 1             | Subcategoría 2                         |
| -------------------------- | -------------------------------------- |
| "GLP" (estacionarias)      | "Gas licuado del petróleo" (móviles)   |
| "Gasolina" (estacionarias) | "Gasolina/Nafta" (móviles)             |
| "Fuel oil" (estacionarias) | "Fuel oil / Petróleo pesado" (móviles) |

**Recomendación**: normalizar nomenclatura mediante un seed maestro de combustibles (`fuels.json`) y referenciar por código semántico, no por nombre literal.

---

## 2.16 Esquema de datos — campos faltantes para auditabilidad ISO

Por factor, ISO 14064-3:2019 requiere:

- `uncertainty_range`: típicamente ±% (IPCC reporta ±30–50% para Tier 1 ganadería; DEFRA reporta intervalos por gas).
- `data_quality_score`: pedigrí (Pedigree Matrix de Weidema).
- `valid_from`, `valid_to`: vigencia temporal.
- `applicable_geography`: ISO 3166-1 alfa-2 o ISO 3166-2.
- `gas_breakdown`: emisiones por gas individual (DEFRA publica CO₂, CH₄, N₂O por separado).
- `boundary`: cradle-to-gate, cradle-to-grave, WTT, TTW, WTW.
- `methodology`: location-based vs market-based (relevante para Scope 2; GHG Protocol Scope 2 Guidance 2015 requiere ambos).

A nivel de metodología:

- `created_at`, `updated_at`, `valid_year_range`.
- `consolidation_approach`: operational control / financial control / equity share.
- `gwp_version`, `iso_14064_version`, `ghg_protocol_version`.

---

## 2.17 Subcategorías vacías

Cuatro subcategorías declaradas sin dimensiones ni factores:

1. "Emisiones provenientes de otras fuentes" (Scope 1).
2. "Desplazamiento diario de empleados y trabajo remoto" (Scope 3 Cat 7).
3. "Uso de productos de la organización" (Scope 3 Cat 11).
4. "Emisiones provenientes de otras fuentes" (Scope 3).

DEFRA 2025 sí publica factores para:

- **Homeworking**: 0.0314 kg CO₂e/FTE-hour (office equipment) + 0.30234 (heating) = 0.33378 (total). La metodología interna del proyecto (líneas 660–693) sí los recoge — no llegaron al JSON.
- **Use of sold products**: depende del producto; DEFRA da framework, no factores específicos.

**Recomendación**: poblar Homeworking con DEFRA 2025, o remover las subcategorías vacías para evitar confusión al usuario.

---

## 2.18 Inversión de nomenclatura ganado bovino — HALLAZGO NUEVO

Confirmado en §1.5: la asignación de IPCC 2006 Tabla 10.11 Latin America (Dairy 72, Other Cattle 56) al JSON está invertida:

- IPCC "Dairy" → JSON "Vacas de pastoreo" (73 con manure)
- IPCC "Other Cattle" → JSON "Vacas lecheras" (57 con manure)

Esto está presente en la metodología fuente (línea 130–134 de `methodology_values.txt`).

---

## 2.19 Camélidos = Camels — HALLAZGO NUEVO

Confirmado en §1.5: la asignación de Tabla 10.10 IPCC 2006 _Camels_ (dromedarios, 570 kg, EF=46 kg CH₄/yr) al JSON "Camélidos" sobrevalora ~6× los camélidos sudamericanos reales (alpacas EF=8, llamas estimado 13.5).

---

## 2.20 Granularidad geográfica de la electricidad

La dimensión `Sistema eléctrico` solo admite `"Sistema nacional"`. Países con múltiples sistemas interconectados requieren múltiples valores:

- Brasil: SIN con subsistemas Norte / Nordeste / Sudeste-Centro Oeste / Sur.
- México: SIN con 9 regiones de control.
- Argentina: SADI (post-1992 unificado); SIP en Patagonia.
- Chile: SEN (unificado desde 2017); SIC, SING, Aysén, Magallanes pre-2017.
- Venezuela: SEN.
- Otros: subsistemas en Bolivia, Ecuador, Centroamérica (SIEPAC).

---

# Sección 3 — Referencias bibliográficas

1. **DEFRA (Department for Environment, Food and Rural Affairs)**. (2025). _UK Government GHG Conversion Factors for Company Reporting, 2025_. UK Government. Datasets `DFRA_factors_simple.xlsx` y `DFRA_factors_extended.xlsx` (versiones consultadas: enero 2025 y julio 2025). https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
2. **Hodnebrog, Ø., Etminan, M., Fuglestvedt, J. S., Marston, G., Myhre, G., Nielsen, C. J., Shine, K. P., & Wallington, T. J.** (2013). Global warming potentials and radiative efficiencies of halocarbons and related compounds: A comprehensive review. _Reviews of Geophysics_, 51(2), 300–378. https://doi.org/10.1002/rog.20013
3. **IPCC (Intergovernmental Panel on Climate Change)**. (2006). _2006 IPCC Guidelines for National Greenhouse Gas Inventories_. Eggleston H.S., Buendia L., Miwa K., Ngara T., Tanabe K. (Eds.). IGES, Japan. Vol. 2 Cap. 1 Tabla 1.2 (combustibles); Vol. 3 Cap. 2 (cemento, vidrio), Cap. 4 (acero, cinc); Vol. 4 Cap. 10 Tablas 10.10, 10.11, 10.14, 10.15, 10.16 (ganadería); Vol. 4 Cap. 11 Tabla 11.1 (agricultura). https://www.ipcc-nggip.iges.or.jp/public/2006gl/
4. **IPCC**. (2014). _Climate Change 2014: Synthesis Report. Contribution of Working Groups I, II and III to the Fifth Assessment Report_ (AR5). Cambridge University Press. GWP-100: WG1 Cap. 8 Tabla 8.A.1.
5. **IPCC**. (2019). _2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories_. IGES, Japan. https://www.ipcc-nggip.iges.or.jp/public/2019rf/
6. **IPCC**. (2021). _Climate Change 2021: The Physical Science Basis. Contribution of Working Group I to the Sixth Assessment Report_ (AR6). Cambridge University Press. GWP-100: Cap. 7 Tabla 7.SM.7.
7. **ISO**. (2018). _ISO 14064-1:2018 Greenhouse gases — Part 1: Specification with guidance at the organization level for quantification and reporting of greenhouse gas emissions and removals_. International Organization for Standardization.
8. **ISO**. (2018). _ISO 14067:2018 Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification_. ISO.
9. **ISO**. (2019). _ISO 14064-3:2019 Greenhouse gases — Part 3: Specification with guidance for the verification and validation of greenhouse gas statements_. ISO.
10. **Kool, A., Marinussen, M., & Blonk, H.** (2012). _LCI data for the calculation tool Feedprint for greenhouse gas emissions of feed production and utilization_. Blonk Consultants, Gouda, Países Bajos. _Tabla 21 página 13: Carbon footprint of the average N, P₂O₅ and K₂O fertilizer use in different global regions._ (PDF en `Referencias Factores/Fertilizantes/Fertilizer_production_D03.pdf`).
11. **Lee, D. S., Fahey, D. W., Skowron, A., et al.** (2021). The contribution of global aviation to anthropogenic climate forcing for 2000 to 2018. _Atmospheric Environment_, 244, 117834. https://doi.org/10.1016/j.atmosenv.2020.117834
12. **WRI/WBCSD**. (2004). _The Greenhouse Gas Protocol — A Corporate Accounting and Reporting Standard, Revised Edition_. Washington DC. https://ghgprotocol.org/corporate-standard
13. **WRI/WBCSD**. (2011). _Corporate Value Chain (Scope 3) Accounting and Reporting Standard_. Washington DC. https://ghgprotocol.org/standards/scope-3-standard
14. **WRI/WBCSD**. (2015). _GHG Protocol Scope 2 Guidance — An amendment to the GHG Protocol Corporate Standard_. Washington DC. https://ghgprotocol.org/scope-2-guidance

---

# Anexo A — Resumen de discrepancias por subcategoría

| #   | Subcategoría                                         | Estado factores        | Hallazgos críticos                                                                                                                                                                       |
| --- | ---------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Emisiones fugitivas                                  | OK (AR5)               | Duplicación c-C₃F₆/n-C₄F₁₀; typo HFC-235cb→236cb; faltan HFOs, mezclas, naturales                                                                                                        |
| 2   | Combustiones estacionarias                           | OK con DEFRA 2025      | **GLP kg/ton es valor LNG (-11%)**; biomasa sin factor; Net CV no declarado                                                                                                              |
| 3   | Combustiones móviles                                 | OK                     | Nomenclatura inconsistente con estacionarias; dimensión Tipo sin uso                                                                                                                     |
| 4   | **Electricidad**                                     | **ERROR**              | **0.5349 no corresponde a DEFRA UK ni a metodología interna (0.17489); origen desconocido**                                                                                              |
| 5   | **Ganadería**                                        | **3 ERRORES CRÍTICOS** | **Cabras 35.17 vs 155.1 (suma en lugar de ×); Aves 9810 vs 0.6 (×16,350); Vacas lecheras/pastoreo invertidas; Camélidos usa factor de Camels (×6 sobrevalorado); GWP=30 (AR5+feedback)** |
| 6   | **Agricultura**                                      | **ERROR DE UNIDAD**    | **kg N₂O-N tratado como kg N₂O — falta factor 44/28; subvalorado 36%; aplicación fuera del alcance del factor (EF₂ es para histosoles, no suelos minerales)**                            |
| 7   | **Fertilizantes**                                    | OK pero                | **Valores específicos South America (no country-agnostic); descripción dice "aplicación" pero factores son de producción (cradle-to-gate)**                                              |
| 8   | Procesos industriales (cemento, acero, vidrio, cinc) | OK contra IPCC 2006    | Falta aluminio, cobre, refinación, ácidos                                                                                                                                                |
| 9   | Hospedaje                                            | OK mayormente          | **Italia 39 (debería 14.3, error copy-paste Japón); Colombia 17.4 (debería 14.7)**; "Otro país Latam/Otro país" inventados                                                               |
| 10  | Viajes traslado                                      | OK (DEFRA con RF)      | RF no declarado; mapping Short/Medium/Long impreciso                                                                                                                                     |
| 11  | **Transporte de carga**                              | **DISCREPANCIA −75%**  | **Tren 0.00691 vs 0.02779; Contenedor 0.00365 vs 0.01612; Granel 0.0008 vs 0.00353 — origen desconocido (¿WTT solo?)**                                                                   |
| 12  | Disposición de residuos                              | OK                     | Reciclaje/Incineración 4.6857 uniforme es correcto en DEFRA 2025                                                                                                                         |
| 13  | Productos comprados                                  | OK                     | Metal/Plástico agregados (subvalora aluminio, sobrevalora steel)                                                                                                                         |
| 14  | Agua                                                 | OK                     | Coincide con DEFRA 2025                                                                                                                                                                  |
| 15  | Subcategorías vacías                                 | —                      | Homeworking tiene factores DEFRA en metodología interna pero no en JSON                                                                                                                  |

**Total hallazgos críticos de valor: 7** (Electricidad, Cabras, Aves, Vacas lecheras/pastoreo invertidas, Camélidos, Agricultura unidad, GLP kg/ton).

**Total hallazgos estructurales mayores: 20** (cobertura ISO, cobertura Scope 3, sources sin estructura, GWP inconsistente entre subcategorías, biogénico no separado, Net CV/RF no declarados, country-agnosticism violado en 7 áreas, refrigerantes faltan, procesos industriales LATAM faltan, sumideros ausentes, esquema sin uncertainty/vigencia/geografía, etc.).

**Total hallazgos menores: ~25** (redondeos, typos, granularidad agregada).

---

_Fin del documento._
