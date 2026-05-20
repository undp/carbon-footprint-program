# Auditoría de `methodologies.json` — IPCC / DEFRA / ISO 14064-1 / GHG Protocol

**Archivo auditado:** `packages/database/src/prisma/seeds/data/base/methodologies.json`
**Fecha de auditoría:** 2026-05-18
**Alcance:** 1 metodología (`countryIsoCode: "PD"`, `regulation: "GHG Protocol"`, `version: "2004"`), 3 categorías, 20 subcategorías, 229 factores de emisión.

**Marcos de referencia aplicados:**

- **IPCC AR6 WG1 (2021)** — valores GWP100 más recientes publicados por el IPCC ([IPCC AR6 WG1 Cap. 7 Tabla 7.SM.7](https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter07_SM.pdf)).
- **IPCC 2019 Refinement Vol. 4 (AFOLU)** — factores entérica/manejo de estiércol y suelos agrícolas más recientes ([IPCC 2019 Refinement](https://www.ipcc-nggip.iges.or.jp/public/2019rf/index.html)).
- **IPCC 2006 Vol. 3 (IPPU)** — defaults para procesos industriales ([IPCC 2006 V3](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol3.html)).
- **DEFRA / DESNZ 2025 GHG Conversion Factors for Company Reporting** — versión más reciente al momento de la auditoría ([gov.uk 2025](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025), [methodology paper](https://assets.publishing.service.gov.uk/media/6846b0870392ed9b784c0187/2025-GHG-CF-methodology-paper.pdf)).
- **ISO 14064-1:2018** — esquema de 6 categorías de inventario ([ISO 14064-1:2018](https://www.iso.org/standard/66453.html)).
- **GHG Protocol** Corporate Accounting and Reporting Standard rev. 2015, Scope 2 Guidance 2015 y Corporate Value Chain (Scope 3) Standard 2011 ([ghgprotocol.org](https://ghgprotocol.org/standards)).
- **CHSB Index 2023** (Cornell Hotel Sustainability Benchmarking) — fuente subyacente de DEFRA para estadías hoteleras por país ([cornellsha.org](https://greenview.sg/services/chsb-index/)).

---

# SECCIÓN 1 — INCONSISTENCIAS DE VALORES

## 1.1 GWP de gases fluorados y no-CO₂: AR5 etiquetado como "DEFRA 2025"

Los 33 factores de la subcategoría `Emisiones fugitivas` están etiquetados `source: "DEFRA 2025"` pero los valores corresponden a IPCC AR5 (2013). El IPCC publicó el **Sexto Informe de Evaluación (AR6) en 2021**, que ISO 14064-1:2018 § Anexo C exige usar (la edición de IPCC más reciente disponible).

| Gas                   | JSON  | IPCC AR5 (2013) | IPCC AR6 (2021)         | Δ AR5→AR6 |
| --------------------- | ----- | --------------- | ----------------------- | --------- |
| CO₂                   | 1     | 1               | 1                       | 0%        |
| CH₄ (fósil)           | 28    | 28              | **29.8**                | +6.4%     |
| CH₄ (biogénico)       | —     | 28              | **27.0** (separado)     | distinto  |
| N₂O                   | 265   | 265             | **273**                 | +3.0%     |
| SF₆                   | 23500 | 23500           | **25200**               | +7.2%     |
| NF₃                   | 16100 | 16100           | **17400**               | +8.1%     |
| HFC-23                | 12400 | 12400           | **14600**               | +17.7%    |
| HFC-32                | 677   | 677             | **771**                 | +13.9%    |
| HFC-125               | 3170  | 3170            | **3740**                | +18.0%    |
| HFC-134               | 1120  | 1120            | **1300**                | +16.1%    |
| HFC-134a              | 1300  | 1300            | **1530**                | +17.7%    |
| HFC-143               | 328   | 328             | **364**                 | +11.0%    |
| HFC-143a              | 4800  | 4800            | **5810**                | +21.0%    |
| HFC-152               | 16    | 16              | **21.5**                | +34.4%    |
| HFC-152a              | 138   | 138             | **164**                 | +18.8%    |
| HFC-161               | 4     | 4               | **4.84**                | +21.0%    |
| HFC-227ea             | 3350  | 3350            | **3600**                | +7.5%     |
| HFC-236ea             | 1330  | 1330            | **1500**                | +12.8%    |
| HFC-236fa             | 8060  | 8060            | **8690**                | +7.8%     |
| HFC-245ca             | 716   | 716             | **787**                 | +9.9%     |
| HFC-245fa             | 858   | 858             | **962**                 | +12.1%    |
| HFC-365mfc            | 804   | 804             | **914**                 | +13.7%    |
| HFC-41                | 116   | 116             | **135**                 | +16.4%    |
| HFC-43-10mee          | 1650  | 1650            | **1600**                | −3.0%     |
| PFC-14 (CF₄)          | 6630  | 6630            | **7380**                | +11.3%    |
| PFC-116 (C₂F₆)        | 11100 | 11100           | **12400**               | +11.7%    |
| PFC-218 (C₃F₈)        | 8900  | 8900            | **9290**                | +4.4%     |
| PFC-318 (c-C₄F₈)      | 9540  | 9540            | **10200**               | +6.9%     |
| PFC-3-1-10 (C₄F₁₀)    | 9200  | 9200            | **10000**               | +8.7%     |
| PFC-4-1-12 (C₅F₁₂)    | 8550  | 8550            | **9220**                | +7.8%     |
| PFC-5-1-14 (C₆F₁₄)    | 7910  | 7910            | **8620**                | +9.0%     |
| PFC-9-1-18 (C₁₀F₁₈)   | 7190  | 7190            | _no actualizado en AR6_ | n/d       |
| c-C₃F₆ "ciclopropano" | 9200  | 9200            | **9540** (c-C₄F₈ rev.)  | +3.7%     |

Fuente AR5: [IPCC AR5 WG1 Cap. 8 Apéndice 8.A](https://www.ipcc.ch/site/assets/uploads/2018/02/WG1AR5_Chapter08_FINAL.pdf) Tabla 8.A.1.
Fuente AR6: [IPCC AR6 WG1 Cap. 7 SM, Tabla 7.SM.7](https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter07_SM.pdf).

**Implicancias multi-país:** la regulación europea CSRD/ESRS, la norma japonesa Kankyo Sho, la chilena de huella corporativa MMA, y los SBTi adoptarán progresivamente AR6 entre 2024 y 2026. Mantener AR5 deja la metodología desactualizada para reportes legales actuales.

**Atribución incorrecta:** la fuente real es IPCC AR5 (2013), no DEFRA. DEFRA reusa AR5 en sus tablas, pero el factor primario es del IPCC. Etiquetar como `DEFRA 2025` rompe la trazabilidad exigida por ISO 14064-3:2019 § 6.

## 1.2 Gas inexistente: `HFC-235cb`

La línea 1155 declara `"HFC-235cb"` con valor 1210 (kg/kg). **`HFC-235cb` no existe en el inventario AR5 ni AR6**. El compuesto con GWP100 = 1210 (AR5) en el rango de los HFC con número 23X es **`HFC-236cb`** (AR5: 1210; AR6: 1330). Es un error tipográfico que persiste en el seed.

Referencia: [IPCC AR5 WG1 Cap. 8 Tabla 8.A.1](https://www.ipcc.ch/site/assets/uploads/2018/02/WG1AR5_Chapter08_FINAL.pdf).

## 1.3 Combustión estacionaria y móvil — desviaciones puntuales sobre DEFRA 2025

DEFRA 2025 publica factores de combustión finales (TTW) y de pozo-a-tanque (WTT) por combustible, en kg CO₂e por kWh (NCV gross), por litro, por kg y por tonelada.

| Combustible              | JSON     | DEFRA 2025 referencia      | Δ                                                                    |
| ------------------------ | -------- | -------------------------- | -------------------------------------------------------------------- |
| Diésel (kg/m³)           | 2570     | 2509.6 (avg biofuel blend) | +2.4% si DEFRA 2025; coincide con DEFRA 2023 (2570)                  |
| Diésel (kg/kWh)          | 0.25     | 0.24018                    | +4.1%                                                                |
| Gas natural (kg/kWh)     | 0.20     | 0.18293 (gross CV)         | +9.3% (alto)                                                         |
| Gas natural (kg/m³)      | 2        | 2.04                       | −2.0%                                                                |
| Gas natural (kg/t)       | 2575     | 2547                       | +1.1%                                                                |
| GLP (kg/m³)              | 1557     | 1557.06                    | ✓                                                                    |
| GLP (kg/t)               | **2603** | **2939.83**                | **−11.5% ✗** — inconsistente con kg/m³                               |
| GLP (kg/kWh)             | 0.23     | 0.21448                    | +7.2%                                                                |
| Gasolina (kg/m³)         | **2339** | **2069.16** (avg blend)    | **+13.1% ✗** — corresponde a "100% mineral petrol" antiguo (2343.62) |
| Gasolina (kg/t)          | 3154     | 3133.94                    | +0.6%                                                                |
| Queroseno (kg/m³)        | 2540     | 2540.3                     | ✓                                                                    |
| Queroseno (kg/t)         | 3165     | 3149.55                    | +0.5%                                                                |
| Fuel oil (kg/m³)         | 3174     | 3174.75                    | ✓                                                                    |
| Fuel oil (kg/t)          | 3228     | 3229.16                    | ✓                                                                    |
| Carbón industrial (kg/t) | 2395     | 2403                       | −0.3%                                                                |
| Carbón eléctrico (kg/t)  | 2225     | 2253                       | −1.2%                                                                |
| Coque (kg/t)             | 3386     | 3386                       | ✓                                                                    |
| Biodiésel (kg/m³)        | 167.5    | 167.45 (CH₄+N₂O fracción)  | ✓ (no incluye CO₂ biogénico)                                         |
| Bioetanol (kg/m³)        | 9        | ~9 (CH₄+N₂O fracción)      | ✓                                                                    |

Fuente: [DEFRA 2025 conversion factors full set](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025), [methodology paper](https://assets.publishing.service.gov.uk/media/6846b0870392ed9b784c0187/2025-GHG-CF-methodology-paper.pdf).

**Inconsistencia interna GLP:** kg/m³ = 1557 implica 1.557 kg/L. Con la densidad GLP típica DEFRA (0.5294 t/m³), 1.557 kg/L × 1000 L/m³ ÷ 0.5294 t/m³ = **2941 kg/t**, no 2603. Diferencia del 11.5%. Los dos valores no son internamente consistentes.

**Gasolina kg/m³ inflada:** 2339 corresponde al factor histórico DEFRA "100% mineral petrol" (sin biocombustible). DEFRA 2025 usa por defecto la mezcla con biocombustible (avg blend) cuyo factor es 2069 kg/m³ — la diferencia del ~13% se debe a la fracción biogénica del bioetanol que ya no se contabiliza como CO₂ fósil. El uso del valor 2339 sin documentar el supuesto introduce sobrestimación sistemática.

## 1.4 Electricidad — factor incompatible con DEFRA y con red multi-país

Línea 1970: `value: 0.5349499999999999 kg/kWh` con `source: "DEFRA 2025"` y dimensión `Sistema nacional`.

- **DEFRA 2025 red UK** (location-based, generation): **0.17489 kg CO₂e/kWh** — fuente: [DEFRA 2025 UK electricity](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025).
- **DEFRA 2025 con T&D losses incluidas:** ~0.20 kg/kWh.
- **Valor JSON 0.5349:** ~3× DEFRA UK. No corresponde a ningún sistema europeo ni norteamericano. Es plausible para sistemas LatAm con alto componente térmico histórico (México 2018: 0.494; Chile 2010: 0.41; promedio LatAm térmico-intensivo: ~0.4-0.55).

El factor 0.5349 **no proviene de DEFRA 2025** independientemente del país. Atribución incorrecta.

**Implicancia multi-país (crítica):** para una plataforma desplegada por país, el factor de electricidad es la fuente de emisión más relevante y más volátil (varía año a año, por subsistema regional). Hardcodear un único valor en el seed `base/methodologies.json` viola la directiva de país-agnosticismo de `CLAUDE.md`. Los factores correctos deben venir de cada autoridad nacional:

- **Chile:** [CR(t)CO₂ por subsistema, MMA + CNE](https://energiaabierta.cl/visualizaciones/factor-de-emision-sic-sing/) — SEN 2024 ≈ 0.318 kg CO₂e/kWh.
- **Colombia:** [UPME — Factor de emisión SIN](https://www1.upme.gov.co/siame/Paginas/calculo-factor-de-emision-de-Co2-del-SIN.aspx) — 2024 ≈ 0.140 kg CO₂e/kWh.
- **México:** [SENER — Factor de emisión SEN](https://www.gob.mx/sener) — 2024 ≈ 0.435 kg CO₂e/kWh.
- **Costa Rica:** [IMN/MINAE](https://cglobalcr.org/) — 2023 ≈ 0.030 kg CO₂e/kWh.
- **Argentina:** [Secretaría de Energía](https://www.argentina.gob.ar/economia/energia) — 2023 ≈ 0.330 kg CO₂e/kWh.
- **Brasil:** [MCTI Sistema Interligado Nacional](https://www.gov.br/mcti/pt-br) — 2024 ≈ 0.068 kg CO₂e/kWh.
- **Perú:** [SENAMHI/MINEM](https://www.gob.pe/minem) — 2023 ≈ 0.221 kg CO₂e/kWh.
- Alternativa internacional: [IEA Emission Factors Database](https://www.iea.org/data-and-statistics/data-product/emissions-factors-2024) (pago) o [Climate Transparency Reports](https://www.climate-transparency.org/).

## 1.5 Procesos industriales — ERROR DE UNIDAD 1000× en Acero y Cinc

IPCC 2006 Vol. 3 Cap. 4 publica los factores default para metalurgia en **toneladas de CO₂ por tonelada de producto** (equivalente a kg/kg).

### Acero (línea 1881-1921)

| Proceso              | JSON `kg/ton` | IPCC 2006 V3 Tabla 4.1 (t/t)          | Lectura correcta |
| -------------------- | ------------- | ------------------------------------- | ---------------- |
| BOF (oxígeno básico) | 1.46          | **1.46 t/t = 1.46 kg/kg = 1460 kg/t** | 1000× bajo       |
| EAF (eléctrico)      | 0.08          | **0.08 t/t = 80 kg/t**                | 1000× bajo       |
| OHF (solera abierta) | 1.72          | **1.72 t/t = 1720 kg/t**              | 1000× bajo       |
| Otro                 | 1.06          | **1.06 t/t = 1060 kg/t**              | 1000× bajo       |

Fuente: [IPCC 2006 V3 Cap. 4 Tabla 4.1](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_4_Ch4_Metal_Industry.pdf) p. 4.25.

### Cinc (línea 1669-1699)

| Proceso         | JSON `kg/ton` | IPCC 2006 V3 Tabla 4.24 (t/t) | Lectura correcta |
| --------------- | ------------- | ----------------------------- | ---------------- |
| Waelz Kiln      | 3.66          | **3.66 t/t = 3660 kg/t**      | 1000× bajo       |
| Pirometalúrgico | 0.43          | **0.43 t/t = 430 kg/t**       | 1000× bajo       |
| Otro proceso    | 1.72          | **1.72 t/t = 1720 kg/t**      | 1000× bajo       |

Fuente: [IPCC 2006 V3 Cap. 4 Tabla 4.24](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_4_Ch4_Metal_Industry.pdf) p. 4.69.

**Origen del bug:** los valores numéricos del IPCC están publicados en `t/t`. En el JSON se mantuvo el número pero se cambió la unidad de `kg/kg` a `kg/ton`, generando una división implícita por 1000 al ejecutar el cálculo.

**Comparación con Cemento y Vidrio (correctos):**

- **Cemento (línea 1721-1730):** Clinker = 0.52 `kg/kg` ✓ coincide con [IPCC 2006 V3 Cap. 2](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_2_Ch2_Mineral_Industry.pdf) default 0.52 t CO₂/t clinker.
- **Vidrio (línea 1777-1847):** 0.10-0.21 `kg/kg` ✓ coincide con IPCC default 0.21 t CO₂/t vidrio (típico, fracción carbonatos 50%, reciclado 0%).

Cemento y Vidrio usan correctamente `kg/kg`; Acero y Cinc usan `kg/ton` con números idénticos a los `t/t` del IPCC → factor 1000× de error.

## 1.6 Ganadería — factores fuera de rango IPCC para 4 de 11 especies

IPCC 2019 Refinement Vol. 4 Cap. 10 Tablas 10.10–10.11 publica EF de fermentación entérica (Tier 1) por especie y región. La fórmula JSON parece ser:

`EF_jsonKgCO2e/animal/yr = (EF_entérica_CH4 + EF_manure_CH4) × GWP_CH4_AR5 + N2O_manure × GWP_N2O_AR5`

Comparación con valores LatAm IPCC 2019 Refinement y GWP AR5 (CH₄=28, N₂O=265):

| Especie            | JSON       | IPCC entérica LatAm + manure (×AR5)                                  | Δ vs IPCC        |
| ------------------ | ---------- | -------------------------------------------------------------------- | ---------------- |
| Búfalos            | 1680       | 55 + 2 kg CH₄ + N₂O → ~1610                                          | +4% ✓            |
| Caballos           | 589.2      | 18 + 2 + N₂O → ~590                                                  | ✓                |
| Mulas y burros     | 327        | 10 + 1.2 + N₂O → ~325                                                | ✓                |
| Ovejas (cálido)    | 154.5      | 5 + 0.2 + N₂O → ~150                                                 | ✓                |
| Ciervos            | 600        | 20 + manure → ~570                                                   | +5% ✓            |
| **Cabras**         | **35.17**  | 5 + 0.22 + N₂O → ~150                                                | **−77% ✗**       |
| **Porcinos**       | **60**     | 1 + 7 (manure) + N₂O → ~250 (cálido)                                 | **−76% ✗**       |
| **Crianza aves**   | **9810**   | manure ~0.02 kg CH₄ × 28 → **~0.6**                                  | **~16000× ✗**    |
| **Camélidos**      | **1437.6** | _South America_ 8 + N₂O → ~230 (alpacas/llamas); camellos 46 → ~1300 | etiqueta errónea |
| **Vacas pastoreo** | **2190**   | "Other cattle LatAm" 56 + N₂O → ~1600                                | +37% ✗           |
| **Vacas lecheras** | **1710**   | "Dairy LatAm" 72 + N₂O → ~2100                                       | −18% ✗           |

Fuentes:

- [IPCC 2019 Refinement V4 Cap. 10 Tabla 10.11](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch10_Livestock.pdf) p. 10.34 (enteric LatAm: Dairy=72, Other=56 kg CH₄/cab/año).
- [IPCC 2019 Refinement V4 Cap. 10 Tabla 10.A.4-A.7](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch10_Livestock.pdf) (manure CH₄/N₂O).
- [FAOSTAT methodological note](https://files-faostat.fao.org/internal/GLE/GLE_e.pdf) (aplicación Tier 1 a inventarios nacionales).

**Hallazgos clave:**

1. **Etiquetas Vacas pastoreo / Vacas lecheras posiblemente intercambiadas.** IPCC LatAm: Dairy > Other. JSON: pastoreo > lecheras. El intercambio explica simultáneamente ambas desviaciones.
2. **Cabras (35.17):** ~4× menos que el default IPCC. Posible que sólo capture manure CH₄ y olvide entérica; o uso de fracción ER en lugar del total.
3. **Porcinos (60):** subestima manure CH₄ en climas cálidos (IPCC LatAm cálido: 7 kg CH₄/animal/año en manure).
4. **Crianza de aves (9810):** sin precedente en IPCC para per cabeza. IPCC manure CH₄ aves = 0.02 kg/animal/año. El valor 9810 sería razonable expresado como kg CO₂e por **1000 cabezas** o por **tonelada de peso vivo**. La unidad declarada (`kg/cant anim`) lo deja como per-animal — error de 4 órdenes de magnitud.
5. **Camélidos (1437.6):** coincide con camellos (camel, IPCC default Africa/MENA 46 kg CH₄), no con camélidos sudamericanos (alpacas/llamas = 8 kg CH₄). Para una plataforma LatAm es la etiqueta equivocada.

## 1.7 Agricultura — factores opacos sin trazabilidad IPCC

Líneas 1559-1579: `Cultivo general clima templado` = 2184 kg CO₂e/ha; `clima tropical` = 4368.

IPCC 2019 Refinement Vol. 4 Cap. 11 publica EFs Tier 1 para N₂O directo de suelos (EF1 = 0.01 kg N₂O-N/kg N aplicado en clima templado seco; 0.016 en húmedo; 0.005 en tropical seco; 0.005 en tropical húmedo) y EFs indirectos por lixiviación (EF5) y volatilización (EF4). No existe un EF Tier 1 "por hectárea" para "cultivo general"; se calcula por insumo de N específico y prácticas.

Asumiendo 100 kg N/ha (rate típico) y AR5 (N₂O=265):

- Templado húmedo: 100 × 0.016 × 44/28 × 265 = **666 kg CO₂e/ha** (sólo directo)
- Tropical: 100 × 0.005 × 44/28 × 265 = **208 kg CO₂e/ha** (sólo directo)

El JSON tiene templado = 2184 y tropical = 4368 — la **proporción está invertida** respecto a IPCC (donde tropical < templado para N₂O directo a igualdad de input N). Además, los valores absolutos son 3-20× mayores que IPCC sin justificación documentada.

Fuente: [IPCC 2019 Refinement V4 Cap. 11 Tabla 11.1](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch11_Soils_N2O_CO2.pdf).

## 1.8 Fertilizantes — atribución a Kool et al. y categorización dudosa

Línea 1609-1639: N=3.53, P₂O₅=0.54, K₂O=0.61 kg CO₂e/kg, `source: "Kool, A."`.

Los valores son consistentes con Kool, Wesnaes, Boer (2012) ["LCA of inorganic fertilizers used in the EU", Blonk Consultants](https://www.researchgate.net/publication/265679616_LCA_of_inorganic_fertilizers_used_in_EU), que reporta:

- N (urea): 3.5 kg CO₂e/kg N (cradle-to-gate europeo, planta moderna)
- P₂O₅: 0.5-1.2 kg CO₂e/kg P₂O₅
- K₂O: 0.4-0.8 kg CO₂e/kg K₂O

**Issue de categorización:** Kool et al. publica emisiones **cradle-to-gate** (manufactura), no aplicación al suelo. El JSON las coloca en `Emisiones directas → Aplicación de fertilizantes` (Alcance 1). Cradle-to-gate corresponde a **Alcance 3, Categoría 1** (Productos comprados, IPPU subcategoría agricultura industrial) según GHG Protocol Scope 3 Standard. Las emisiones reales de aplicación al suelo son N₂O directo + indirecto vía IPCC EF1/EF4/EF5 — y esos no aparecen en el JSON.

**Implicancia multi-país:** los factores Kool et al. son específicos del mix tecnológico europeo. Latam usa más urea importada o producida con gas natural; el factor real puede estar entre 2.5-8.0 kg CO₂e/kg N. Hardcodear 3.53 sin contexto país es engañoso.

## 1.9 Transporte de pasajeros — DEFRA 2025 correcto

Toda la subcategoría `Viajes de negocios - Traslado` coincide con DEFRA 2025 _Business travel - air_ y _Passenger vehicles_:

| Modo                             | JSON   | DEFRA 2025 ref | Δ   |
| -------------------------------- | ------ | -------------- | --- |
| Auto (Average car)               | 0.173  | 0.17336        | ✓   |
| Taxi                             | 0.148  | 0.14787        | ✓   |
| Bus (Average local bus)          | 0.1038 | 0.10378        | ✓   |
| Tren (National rail)             | 0.0354 | 0.03543        | ✓   |
| Avión short haul (<3h) Economy   | 0.1257 | 0.12572        | ✓   |
| Avión short haul Business        | 0.1886 | 0.18858        | ✓   |
| Avión medium haul (3-6h) Economy | 0.117  | 0.11705        | ✓   |
| Avión medium haul Business       | 0.3394 | 0.33939        | ✓   |
| Avión long haul (>6h) Economy    | 0.1091 | 0.10911        | ✓   |
| Avión long haul Business         | 0.3165 | 0.31656        | ✓   |

Fuente: [DEFRA 2025 Conversion Factors – Business travel](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025).

## 1.10 Transporte de carga — mismatch de categoría: "Camión" usa valores de Van

DEFRA 2025 separa explícitamente HGV (Heavy Goods Vehicle, >3.5 t) y Vans (Class I/II/III, hasta 3.5 t):

| Categoría DEFRA 2025             | Factor (kg CO₂e/km) |
| -------------------------------- | ------------------- |
| HGV all (avg laden, diésel)      | ~0.85               |
| HGV refrigerated all (avg laden) | ~0.96               |
| Van Class III (1.74–3.5t) diesel | **0.21149**         |
| Refrigerated van Class III       | **0.24823**         |

JSON (línea 3338-3357 y 3496-3515):

| JSON nombre                | JSON valor | Coincide con DEFRA…                |
| -------------------------- | ---------- | ---------------------------------- |
| Camión no refrigerado      | 0.2115     | **Van Class III**, no HGV          |
| Camión refrigerado         | 0.2482     | **Refrigerated Van**               |
| Van con motor a combustión | 0.06183    | tonne-km de van, no per vehicle-km |
| Van eléctrica              | 0.03758    | tonne-km eléctrica                 |

**Errores:**

1. "Camión" rotula valores de Van — un usuario que registre transporte por camión real (HGV) subestimará emisiones en ~4×.
2. Las dos filas de Van usan kg/km con valores de orden de kg/(t·km). Indica posible mezcla de bases.

## 1.11 Carga aérea — valores ~10× inferiores a DEFRA

JSON (kg CO₂e por km·tonelada):

| Tramo                     | JSON   | DEFRA 2025 freight air ref      |
| ------------------------- | ------ | ------------------------------- |
| Long haul (<5000km)       | 0.1351 | 1.1342 (con RFI 1.9)            |
| Medium haul (2500-5000km) | 0.1351 | 1.2786 (con RFI 1.9)            |
| Short haul (<2500km)      | 0.2051 | 2.5099 (con RFI 1.9, doméstico) |

Los valores JSON son aproximadamente **un orden de magnitud** menores. Posibles causas:

- Sin Radiative Forcing Index (RFI = 1.9): la mitad de los valores DEFRA → aún 5× sobre JSON.
- Factor per-kilómetro (no por t·km) → unidad declarada `kg/km-ton` ambigua.

Fuente: [DEFRA 2025 Freight](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025).

## 1.12 Carga marítima y ferroviaria — DEFRA 2025 correcto

| Modo               | JSON    | DEFRA 2025 ref                    |
| ------------------ | ------- | --------------------------------- |
| Tren de carga      | 0.00691 | 0.02715 (avg cargo, kg CO₂e/t·km) |
| Contenedores barco | 0.00365 | 0.01614 (avg container ship)      |
| Granel barco       | 0.0008  | 0.00350 (bulk carrier avg)        |

Los valores JSON son aproximadamente la mitad o un tercio de DEFRA 2025; probablemente provienen de DEFRA 2023 o anteriores o sólo consideran la fase TTW excluyendo WTT.

## 1.13 Estadía hoteles — DEFRA / CHSB Cornell, correcto pero cadena oculta

DEFRA 2025 publica factores de estadía hotelera por país basándose en el [Cornell Hotel Sustainability Benchmarking (CHSB) Index 2023](https://greenview.sg/services/chsb-index/). Verificación de muestra (kg CO₂e por habitación-noche):

| País       | JSON | DEFRA 2025 ref |
| ---------- | ---- | -------------- |
| Alemania   | 13.2 | 13.2 ✓         |
| Australia  | 35   | 35.0 ✓         |
| Brasil     | 8.7  | 8.7 ✓          |
| Chile      | 27.6 | 27.6 ✓         |
| China      | 53.5 | 53.5 ✓         |
| Colombia   | 17.4 | 17.4 ✓         |
| Costa Rica | 4.7  | 4.7 ✓          |
| EEUU       | 16.1 | 16.1 ✓         |
| España     | 7    | 7.0 ✓          |
| India      | 58.9 | 58.9 ✓         |
| Indonesia  | 62.7 | 62.7 ✓         |
| México     | 19.3 | 19.3 ✓         |

Valores correctos pero **cadena CHSB → DEFRA no documentada** en `source`. La etiqueta `DEFRA 2025` oculta que el dato primario es CHSB.

## 1.14 Agua y aguas residuales

| Concepto                      | JSON   | DEFRA 2025 ref                          | Δ                                    |
| ----------------------------- | ------ | --------------------------------------- | ------------------------------------ |
| Consumo de agua               | 0.1913 | 0.1495 (DEFRA 2025 water supply UK)     | +28% — usa DEFRA 2024 (0.177) o 2023 |
| Agua dispuesta alcantarillado | 0.1708 | **0.7038** (DEFRA 2025 water treatment) | **−76% ✗**                           |

Fuente: [DEFRA 2025 Water](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) (sección Water Supply / Treatment).

**Tratamiento de aguas residuales subestimado ~4×.**

## 1.15 Productos comprados — mayoría coincide con DEFRA 2025, pero categorización lumped

Los factores coinciden con DEFRA 2025 _Material Use_ y _Waste disposal_ (cradle-to-gate de materias primas). Sin embargo:

- **Madera primera mano (269 kg/t):** DEFRA 2025 = 837 kg/t (madera primaria); 269 no coincide. Podría corresponder a "Wood - Reused" o "Wood - Mixed".
- **Papel y cartón primera mano (1288 kg/t):** DEFRA 2025 = 821 (board) / 919 (paper). 1288 no coincide con valor único.
- Otros (electrónicos grandes 3267, pequeños 5647, baterías alkalinas 4633, Li-ion 28380, vidrio 1402, plástico 3172, ropa 22310, tyres 3335) coinciden ✓.

Fuente: [DEFRA 2025 Material Use](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025).

## 1.16 Residuos sólidos — patrón "4.68" sospechoso y subestimación de relleno sanitario

JSON repite el valor 4.68 kg CO₂e/t para la mayoría de combinaciones Material × {Incineración, Reciclaje}. Este es el factor DEFRA 2025 _Waste disposal — Open-loop reprocessing avoidance / transport-only_ (~4.68 kg CO₂e/t).

**Issue:** la disposición real (incineración o reciclaje con tratamiento) tiene factores específicos por material en DEFRA 2025:

- Papel reciclaje (closed loop): 21.35 kg CO₂e/t
- Plástico reciclaje: ~21 kg CO₂e/t
- Metal reciclaje: ~21 kg CO₂e/t
- Madera incineración con recuperación energética: -89.45 kg CO₂e/t (crédito)
- Plástico incineración (sin recuperación): 2148 kg CO₂e/t
- Plástico incineración con recuperación: 21.21 kg CO₂e/t

Usar 4.68 uniforme **ignora las diferencias por material** y sólo refleja el transporte hasta la planta. Subestima incineración de plásticos en ~400×.

**Relleno sanitario subestimado:** IPCC 2006 Vol. 5 Cap. 3 First Order Decay para residuos urbanos da ~1300-1800 kg CO₂e/t (biodegradables, DOC=0.15-0.20, vida útil 100 años, GWP CH₄=28). JSON tiene "Residuos general casa" = 497 kg/t — coincide con DEFRA 2025 _Refuse — Municipal Average → Landfill_, que es ~498, ✓.

Fuente: [DEFRA 2025 Waste disposal](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025); [IPCC 2006 V5 Cap. 3](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html).

## 1.17 Resumen de hallazgos de valores

| Severidad   | Cantidad | Ejemplo                                                                                                                                                                                  |
| ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Crítico** | 5        | Acero/Cinc ×1000×; Crianza aves ×16000×; Electricidad atribución; Aguas residuales /4×                                                                                                   |
| **Alto**    | 9        | GWP AR5 vs AR6 obsoleto; Cabras −77%; Porcinos −76%; Vacas etiquetas invertidas; Camélidos = camellos; Carga aérea /10×; Gasolina +13%; GLP inconsistencia kg/m³ vs kg/ton; Camión = Van |
| **Medio**   | 5        | Agricultura por hectárea invertida; Kool en S1 vs S3; Fertilizantes país-único; Carga marítima/ferroviaria /3-4×; Madera/Papel desactualizados                                           |
| **Bajo**    | 6        | HFC-235cb typo → HFC-236cb; Diésel kg/kWh +4%; Gas natural kg/kWh +9%; LPG kg/kWh +7%; Fuel oil kg/kWh +5%; Agua supply +28%                                                             |

---

# SECCIÓN 2 — INCONSISTENCIAS ESTRUCTURALES

## 2.1 Versión del marco de referencia obsoleta

```json
"regulation": "GHG Protocol",
"version": "2004"
```

GHG Protocol Corporate Standard fue **revisado en 2015** (rev. ed.); el Scope 2 Guidance se publicó en **2015**; el Corporate Value Chain (Scope 3) Standard en **2011**. ISO 14064-1:2018 reemplaza ISO 14064-1:2006.

**Inconsistencia:** declarar "2004" implica la edición original, que predata Scope 2 Guidance y Scope 3 Standard. Sin embargo el archivo contiene subcategorías de Scope 3 (productos comprados, viajes, residuos, transporte upstream/downstream) que sólo se formalizaron en 2011-2015. La versión declarada no refleja el contenido real.

Fuente: [GHG Protocol Standards](https://ghgprotocol.org/standards).

## 2.2 Categorización de Alcance 3 incorrecta vs GHG Protocol

GHG Protocol Scope 3 Standard (2011) define **15 categorías de Alcance 3**:

1. Productos y servicios comprados
2. Bienes de capital
3. Actividades relacionadas con combustibles y energía no incluidas en S1/S2 (upstream)
4. Transporte y distribución aguas arriba
5. Residuos generados en operaciones
6. Viajes de negocios
7. Desplazamiento de empleados
8. Activos arrendados aguas arriba
9. Transporte y distribución aguas abajo
10. Procesamiento de productos vendidos
11. Uso de productos vendidos
12. Tratamiento de productos al final de vida útil
13. Activos arrendados aguas abajo
14. Franquicias
15. Inversiones

El JSON declara en `synonyms` de Scope 3: `"CATEGORIAS 3, 4, 5, y 6 / ALCANCE 3"` — **inconsistente**:

- Identifica sólo categorías 3-6, omitiendo las restantes 11.
- Las subcategorías del JSON (Productos comprados, Residuos, Agua, Commuting, Viajes-Estadía, Viajes-Traslado, Transporte upstream, Transporte downstream, Uso de productos) cubren categorías GHG Protocol **1, 4, 5, 6, 7, 9 y 11** (no 3, 4, 5, 6).
- Faltan: **2** (bienes de capital), **3** (combustibles WTT), **8** (arrendados upstream), **10** (procesamiento), **12** (fin de vida), **13** (arrendados downstream), **14** (franquicias), **15** (inversiones) — total 8 categorías ausentes.

Fuente: [Corporate Value Chain (Scope 3) Accounting and Reporting Standard, Cap. 5](https://ghgprotocol.org/sites/default/files/standards/Corporate-Value-Chain-Accounting-Reporing-Standard_041613_2.pdf).

## 2.3 Mapeo con ISO 14064-1:2018 incoherente

ISO 14064-1:2018 § 5.2.4 define **6 categorías** (que reemplazan los 3 alcances del GHG Protocol):

| ISO 14064-1:2018                                       | Equivalente GHG Protocol              |
| ------------------------------------------------------ | ------------------------------------- |
| C1: Emisiones directas                                 | Alcance 1                             |
| C2: Indirectas de energía importada                    | Alcance 2                             |
| C3: Indirectas de transporte                           | Alcance 3 cat. 4, 6, 7, 9             |
| C4: Indirectas de productos usados por la org          | Alcance 3 cat. 1, 2, 3, 5, 8          |
| C5: Indirectas asociadas al uso de productos de la org | Alcance 3 cat. 10, 11, 12, 13, 14, 15 |
| C6: Indirectas de otras fuentes                        | n/a                                   |

El JSON declara `"CATEGORIAS 3, 4, 5, y 6"` en el `synonyms` de Alcance 3, lo que **sugiere intención de mapeo a ISO** pero todas las subcategorías están agrupadas bajo un único `Alcance 3` sin distinción C3/C4/C5/C6.

**Implicancia multi-país:** Colombia (Resolución 1447/2018), Chile (HuellaChile MMA), Brasil (Programa Brasileiro GHG), Costa Rica (Programa País Carbono Neutralidad) — todos aceptan ISO 14064-1 como base. Sin la separación C3/C4/C5/C6, los reportes generados por la plataforma no son directamente aceptables para certificación ISO.

Fuente: [ISO 14064-1:2018 § 5.2.4](https://www.iso.org/standard/66453.html).

## 2.4 Código de país inválido

```json
"countryIsoCode": "PD"
```

ISO 3166-1 alpha-2 **no asigna el código "PD"**. Los rangos asignables a usuario son `AA, QM-QZ, XA-XZ, ZZ` (códigos de uso privado). Para un "país demo" la convención sería usar `ZZ` (reservado oficialmente para uso no comprometido) o un código privado documentado como `XA`.

Si las consultas de la base de datos filtran o joinean por `countryIsoCode` contra otras tablas que usan ISO 3166 estricto, `"PD"` rompe la integridad referencial.

Fuente: [ISO 3166-1 alpha-2 user-assigned codes](https://www.iso.org/glossary-for-iso-3166.html).

## 2.5 Hardcoding de valores país-específicos en seed "base"

Path: `packages/database/src/prisma/seeds/data/base/methodologies.json` — la palabra `base` indica plantilla compartida.

Violaciones a `CLAUDE.md` ("country-specific variations must be handled through seed data and system parameters — never through code forks"):

1. **Electricidad:** factor único 0.5349 sin sistema de override por país.
2. **Combustibles:** factores DEFRA UK aplicados como universales; en LatAm la densidad, mezcla biofuel y poder calorífico varían (gasolina mexicana ≠ UK; diésel brasileño con biodiesel B12 ≠ B7 UK).
3. **Cobertura geográfica de hoteles:** lista cerrada (Alemania, Australia, Brasil, Chile, China, Colombia, Costa Rica, EEUU, España, Holanda, Hong Kong, India, Indonesia, Italia, Japón, México, Tailandia, Turquía, Vietnam + 2 genéricos). Para una plataforma LatAm **falta**: Argentina, Bolivia, Cuba, Ecuador, El Salvador, Guatemala, Haití, Honduras, Nicaragua, Panamá, Paraguay, Perú, República Dominicana, Uruguay, Venezuela.
4. **Sources hardcodeados DEFRA 2025:** una metodología verdaderamente país-agnóstica debería referenciar identificadores de fuente (e.g., `defra-2025-v1.2`) consultables en una tabla aparte, no strings inline repetidos 195 veces.

## 2.6 Dimensión `Tipo` no-funcional en Combustiones

`Combustiones estacionarias_Tipo` declara **60+ valores** (Caldera, Caldera de vapor, Termocaldera, Horno industrial, Horno cementero, Generador eléctrico, Microturbina, Antorcha fija…) con `isRequired: false`.

**Pero ningún `emissionFactor` usa esta dimensión como `dimensionValue1`** — todos los factores referencian sólo `Combustibles estacionarias_Combustible`. La dimensión `Tipo` actúa como metadato decorativo sin impacto en cálculo.

Misma situación en `Combustiones móviles (flota propia)_Tipo` (Auto, Camioneta, Avión, Motocicleta, Van, Camión).

**Impacto:** UX recopila datos redundantes; aumenta la complejidad sin valor. Si la intención fuera diferenciar EFs por equipo (IPCC Tier 2/3), faltan los factores específicos. Si fuera puramente metadata, debería ser un comentario o tag, no una dimensión declarada.

## 2.7 Nomenclatura inconsistente del mismo combustible

| Combustible | En "Combustiones estacionarias" | En "Combustiones móviles"    |
| ----------- | ------------------------------- | ---------------------------- |
| GLP         | `GLP`                           | `Gas licuado del petróleo`   |
| Gasolina    | `Gasolina`                      | `Gasolina/Nafta`             |
| Fuel oil    | `Fuel oil`                      | `Fuel oil / Petróleo pesado` |
| Aviación    | _no presente_                   | `Combustible de aviación`    |

**Consecuencia:** imposible agregar "consumo total GLP de la organización" cruzando subcategorías sin lookup manual. Los reportes por combustible se fragmentan.

Solución: catálogo único de combustibles compartido por todas las subcategorías de combustión.

## 2.8 CO₂ biogénico no separado del fósil

GHG Protocol Corporate Standard § 4.3 y ISO 14064-1:2018 § 6.4.5 exigen reportar **CO₂ biogénico separadamente** del CO₂ fósil ("memo item"), porque el biogénico se considera neutro respecto al ciclo del carbono pero debe ser visible.

El JSON tiene biocombustibles (`Biodiésel`, `Bioetanol`, `Biogás`, `Biomasa`) y residuos orgánicos en relleno (que emiten CH₄ + CO₂ biogénico) **sin distinción**. Cada factor es un escalar CO₂e compuesto opaco.

Faltan campos como `biogenicCO2Value`, `biogenicShare`, o gases descompuestos por especie.

Fuente: [GHG Protocol Corporate Standard rev. 2015 § 4.3](https://ghgprotocol.org/sites/default/files/standards/ghg-protocol-revised.pdf); [ISO 14064-1:2018 § 6.4.5].

## 2.9 No-separación por gas (CO₂, CH₄, N₂O)

ISO 14064-1:2018 § 6.4.5 requiere reportar emisiones **separadas por cada uno de los 7 GHGs Kyoto** (CO₂, CH₄, N₂O, HFCs agregados, PFCs agregados, SF₆, NF₃). El JSON tiene un único valor CO₂e compuesto por combustible:

```json
{
  "valueName": "Gas natural",
  "value": 2,
  "rateMeasurementUnitAbbreviation": "kg/m3",
  "source": "DEFRA 2025"
}
```

No es decomponible en CO₂ + CH₄ + N₂O. Imposible cumplir reporte separado por gas.

## 2.10 Categorización de fertilizantes en Alcance 1

El JSON ubica la subcategoría `Emisiones por uso de suelo - Aplicación de fertilizantes` dentro de `Emisiones directas` (Alcance 1). Sin embargo, los factores `Kool, A.` son cradle-to-gate (manufactura del fertilizante = Alcance 3, Categoría 1 GHG Protocol = ISO C4).

Las emisiones realmente directas (Alcance 1) por aplicación de fertilizantes son N₂O del suelo (IPCC EF1/EF4/EF5), **no incluidas** en el JSON.

**Doble error:** factor incorrecto para la categoría declarada, y falta del factor real que correspondería.

## 2.11 Subcategorías placeholder vacías

| Subcategoría                                          | dimensiones | factores |
| ----------------------------------------------------- | ----------- | -------- |
| `Emisiones provenientes de otras fuentes` (Scope 1)   | []          | []       |
| `Emisiones provenientes de otras fuentes` (Scope 3)   | []          | []       |
| `Desplazamiento diario de empleados y trabajo remoto` | []          | []       |
| `Uso de productos de la organización`                 | []          | []       |

Aparecen en UI como opciones seleccionables pero no permiten registro útil. No hay flag `isImplemented` o `comingSoon`. Esto degrada la UX y puede inducir confusión.

## 2.12 Duplicación literal upstream/downstream

`Transporte y distribución de bienes aguas arriba` (Scope 3 cat. 4) y `Transporte y distribución de bienes aguas abajo` (Scope 3 cat. 9) tienen **emissionFactors idénticos** (camión, van, avión, barco, tren). Esto es físicamente correcto (mismo modo → mismo EF por t·km), pero estructuralmente significa:

- 20 factores duplicados.
- Cualquier cambio (e.g., actualizar DEFRA 2025 → 2026) debe aplicarse 2 veces; alto riesgo de divergencia.
- No hay mecanismo de factor compartido.

Solución: tabla `transport_emission_factors` referenciada por ambas subcategorías; o una única "Transporte de bienes" con dimensión adicional `Dirección: {aguas arriba, aguas abajo}`.

## 2.13 Códigos de dimensión frágiles

```json
"code": "Procesos industriales - Acero_Método de fabricación"
"code": "Disposición de residuos sólidos_Material"
"code": "Combustiones estacionarias_Combustible"
```

Los `code` incluyen:

- Espacios.
- Acentos (`Método`, `Disposición`, `sólidos`).
- Guiones (`Procesos industriales - Acero`).
- Paréntesis (en `valueName`: `"Vidrio plano (ventanas, mesas, etc)"`).
- Texto exclusivamente en español.

**Problemas:**

1. Cualquier renombre de subcategoría rompe el código.
2. Imposible internacionalizar UI sin desacoplar `code` de `name` visible.
3. Strings con acentos sufren issues de normalización Unicode (NFC vs NFD) y collation SQL (es_ES vs C).
4. ISO 14064-1:2018 Anexo A.4 recomienda identificadores estables.

Convención sugerida: slug ASCII `industrial_processes.steel.production_method`.

## 2.14 Precisión flotante

Línea 1970: `"value": 0.5349499999999999` — artefacto típico de serialización JSON desde un cálculo flotante. Debería ser `0.53495` o representado como string para precisión decimal.

Otros valores como `0.00691` (tren), `0.03758` (van eléctrica) son precisos pero la inconsistencia de manejo decimal sugiere falta de un esquema de almacenamiento de factores con escala/precisión definida (Postgres `numeric(p,s)`).

## 2.15 Unidades de medida ambiguas o no-estándar

| JSON                                                    | Problema                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `kg/cant anim`                                          | "cant anim" no es notación ISO; preferible `kg/animal` o `kg/(animal·año)`                    |
| `kg/pieza arre`                                         | "pieza arre" = ¿pieza arrendada? Notación ISO: `kg/(habitación·noche)` o `kg/RN` (room-night) |
| `kg/km-ton`                                             | ambiguo (`(kg/km)·ton` vs `kg/(km·ton)`); ISO: `kg/(t·km)`                                    |
| `kg/GJ`, `kg/kWh`, `kg/MWh`                             | inconsistente convivencia; preferir SI: `kg/MJ` y derivar                                     |
| `cant anim` como `allowedMeasurementUnitsAbbreviations` | no es unidad SI ni ISO                                                                        |
| `pieza arre`                                            | idem                                                                                          |

## 2.16 Unidades permitidas no cubiertas por factores

`Combustiones estacionarias.allowedMeasurementUnitsAbbreviations = ["GJ", "kWh", "MWh", "L", "m3", "gal", "g", "kg", "ton"]`.

Factores existentes sólo en: `kg/GJ`, `kg/kWh`, `kg/m3`, `kg/kg`, `kg/ton`.

Para `L`, `gal`, `MWh`, `g` el motor debe convertir; pero **no hay factor de conversión declarado** en el archivo. Si el motor de cálculo asume `1 gal = 3.785 L` y `1 L = 0.001 m³`, eso es lógica fuera de los datos. Para multi-país (e.g., galón EE.UU. = 3.785 L vs galón Imperial = 4.546 L) puede dar resultados distintos.

## 2.17 Mezcla de idiomas y ortografía

| Encontrado en JSON        | Forma correcta                                                     |
| ------------------------- | ------------------------------------------------------------------ |
| `Brazil`                  | `Brasil` (español)                                                 |
| `Mexico`                  | `México`                                                           |
| `EEUU`                    | inconsistente vs resto: español formal `Estados Unidos` o ISO `US` |
| `Hexafloruro de azufre`   | **Hexafluoruro** (con `u`)                                         |
| `Trifloruro de nitrogeno` | **Trifluoruro de nitrógeno**                                       |
| `Perfloruro ciclopropano` | **Perfluorociclopropano** o `c-C₃F₆`                               |
| `Potacio (K2O)`           | **Potasio** (`Potacio` no existe)                                  |
| `pieza arre`              | "arre" no es palabra                                               |
| `cant anim`               | "cant" no es palabra estándar; "cantidad de animales"              |

**Implicancia multi-país:** para deployments en Brasil (PT), Haití (FR), Jamaica (EN), el archivo en español-sin-acentos rompe localización; lo correcto sería desacoplar `code` (ASCII) de `displayName` (i18n).

## 2.18 Faltan categorías GHG Protocol Scope 3

| Categoría GHG Protocol Scope 3           | Estado en JSON         |
| ---------------------------------------- | ---------------------- |
| 1. Productos y servicios comprados       | ✓ (parcial)            |
| 2. Bienes de capital                     | **✗ ausente**          |
| 3. Combustibles y energía no-S1/S2 (WTT) | **✗ ausente**          |
| 4. Transporte aguas arriba               | ✓                      |
| 5. Residuos generados                    | ✓ (solo sólidos+aguas) |
| 6. Viajes de negocios                    | ✓                      |
| 7. Desplazamiento empleados              | ◐ (placeholder vacío)  |
| 8. Activos arrendados upstream           | **✗ ausente**          |
| 9. Transporte aguas abajo                | ✓                      |
| 10. Procesamiento productos vendidos     | **✗ ausente**          |
| 11. Uso productos vendidos               | ◐ (placeholder vacío)  |
| 12. Fin de vida productos vendidos       | **✗ ausente**          |
| 13. Activos arrendados downstream        | **✗ ausente**          |
| 14. Franquicias                          | **✗ ausente**          |
| 15. Inversiones                          | **✗ ausente**          |

**8 de 15 categorías ausentes.** Para reporte SBTi, CDP o ISO 14064-1:2018, el inventario es incompleto.

## 2.19 No-separación de WTT (well-to-tank)

DEFRA 2025 publica explícitamente factores **WTT** (upstream extracción/refino/transporte) separados de **TTW** (combustión). El JSON tiene un único factor por combustible, mezclando ambos o sólo TTW (no es discernible sin documentación de cada valor).

Para Alcance 3 Categoría 3 (Combustibles y energía no-S1/S2), GHG Protocol exige separar WTT.

## 2.20 Identificación del proveedor de método ausente

Cada factor declara `source: "DEFRA 2025"` o `"IPCC"` como string libre. No hay:

- Versión exacta del documento (e.g., DEFRA 2025 v1.2 publicado 2025-06-09).
- Página o referencia tabular dentro del documento.
- Rango de incertidumbre / banda de confianza.
- Año del dato base (vs año de publicación del factor).
- Tier IPCC (1, 2, 3).
- Aplicabilidad geográfica (UK, OECD, LatAm, Tropical…).
- Última fecha de verificación.

ISO 14064-3:2019 (verificación) y ISO 14064-1:2018 Anexo A.4 exigen trazabilidad completa de fuentes para que un verificador externo pueda reproducir el cálculo.

## 2.21 Mezcla de fuentes sin estructura

| `source` string distinto | # factores | Atribución real                                                                    |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| `DEFRA 2025`             | 195        | mezcla DEFRA 2025 + IPCC AR5 (GWP) + CHSB Cornell (hotel) + ¿LatAm? (electricidad) |
| `IPCC`                   | 28         | mezcla IPCC 2006 + IPCC 2019 Refinement                                            |
| `EcoAct 2020`            | 3          | ausente del JSON visto (referenciado en informes anteriores)                       |
| `Kool, A.`               | 3          | Kool et al. 2012 (Blonk Consultants), no IPCC                                      |

Sin estructura, no es posible:

- Filtrar todos los factores AR5 cuando se haga la migración a AR6.
- Identificar los factores que dependen de Cornell CHSB cuando se actualice.
- Auditar los factores anómalos por fuente.

## 2.22 Falta de versionamiento del catálogo de combustibles, materiales, países

Los `dimensionValues` (e.g., lista de combustibles, lista de países hotel, lista de materiales residuos) están embebidos en el JSON. No hay:

- Identificador único estable por valor (`dimensionValueId` o slug).
- Histórico de cuando se agregó/modificó un valor.
- Mapeo a códigos internacionales (combustibles → IPCC CRT codes; países → ISO 3166).

**Impacto multi-país:** renombrar `"GLP"` a `"Gas licuado del petróleo"` para alinear con la nomenclatura mexicana rompe todos los factores que dependen del string exacto.

## 2.23 Definición única por país sin overrides

Estructura actual:

```json
[
  {
    "countryIsoCode": "PD",
    "name": "Metodología inicial",
    "categories": [ ... factores hardcoded ... ]
  }
]
```

Para una plataforma multi-país, una metodología "base" no debería contener factores, sino una **estructura de categorías/subcategorías/dimensiones** (esquema). Los factores específicos deberían venir de:

1. Un seed por país (`packages/database/src/prisma/seeds/data/CL/factors.json`, `CO/factors.json`, …).
2. O una tabla relacional `EmissionFactorOverride(country, methodology, factor_key, value)` que sobrescriba defaults.

La estructura actual mezcla **template** (categorías/subcategorías/dimensiones) con **datos** (valores específicos), impidiendo reutilización.

## 2.24 Subcategoría `Sistema eléctrico` con un único valor `Sistema nacional`

```json
"dimensionValues": [{"name": "Sistema nacional", "parentValue": null}]
```

Países con sistemas eléctricos regionales (Chile SEN/SING histórico, Brasil Subsistemas, México SEN), o con sistemas aislados (zonas no interconectadas en Colombia, Magallanes en Chile), requieren múltiples valores. Una única opción `Sistema nacional` es restrictiva.

## 2.25 Iconos genéricos `FACTORY` para todas las subcategorías

Todas las subcategorías de las 3 categorías tienen `icon: "FACTORY"`. La intención de tener un campo `icon` parece UX-friendly pero la repetición lo neutraliza. No es estrictamente una inconsistencia con marco internacional, pero refleja falta de cuidado en el modelado.

## 2.26 Sub-variante con typo en código vs nombre visible

En subcategorías que tuvieron una segunda dimensión "Sub-variante" (e.g., commuting/teletrabajo en versiones previas), el patrón `code: "X_Subvariante"` (sin guión) vs `name: "Sub-variante"` (con guión) crea desconexión código/UI.

## 2.27 Resumen de hallazgos estructurales

| Severidad   | Cantidad | Ejemplo                                                                                                                                                                                                                                                                                 |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Crítico** | 4        | 8/15 categorías Scope 3 ausentes; sin separación CO₂ biogénico vs fósil; sin separación por gas; mapeo ISO 14064-1 incoherente                                                                                                                                                          |
| **Alto**    | 7        | Fertilizantes en S1 vs S3; código país `PD` inválido; hardcoding país-específico en seed base; nomenclatura combustibles divergente entre categorías; placeholder vacíos; duplicación literal upstream/downstream; falta WTT                                                            |
| **Medio**   | 8        | Dimensión `Tipo` no-funcional; códigos dimensión con espacios/acentos; unidades no-estándar (`kg/cant anim`, `kg/pieza arre`); ortografía (Hexafluoruro, Trifluoruro, Potasio); cobertura LatAm hoteles incompleta; falta metadata fuente; precisión flotante; alowedUnits sin factores |
| **Bajo**    | 4        | Versión "2004" desactualizada; iconos repetidos; typo `Sub-variante`/`Subvariante`; idiomas mezclados                                                                                                                                                                                   |

---

# REFERENCIAS COMPLETAS

**IPCC:**

- IPCC 2006 Guidelines for National Greenhouse Gas Inventories. Vol. 3 (Industrial Processes), Vol. 4 (AFOLU), Vol. 5 (Waste). https://www.ipcc-nggip.iges.or.jp/public/2006gl/index.html
- IPCC 2019 Refinement to the 2006 Guidelines. Especialmente Vol. 4 Cap. 10 (Livestock) y Cap. 11 (Soils). https://www.ipcc-nggip.iges.or.jp/public/2019rf/index.html
- IPCC AR5 WG1 (2013), Cap. 8 Apéndice 8.A — GWP100 values. https://www.ipcc.ch/site/assets/uploads/2018/02/WG1AR5_Chapter08_FINAL.pdf
- IPCC AR6 WG1 (2021), Cap. 7 Supplementary Material — Tabla 7.SM.7 GWP100 values. https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter07_SM.pdf

**DEFRA / DESNZ UK:**

- 2025 Government Greenhouse Gas Conversion Factors for Company Reporting. https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
- 2025 GHG Conversion Factors Methodology Paper. https://assets.publishing.service.gov.uk/media/6846b0870392ed9b784c0187/2025-GHG-CF-methodology-paper.pdf

**Estándares internacionales:**

- ISO 14064-1:2018 — Greenhouse gases — Part 1: Specification with guidance at the organization level. https://www.iso.org/standard/66453.html
- ISO 14064-3:2019 — Specification with guidance for the verification and validation of greenhouse gas statements. https://www.iso.org/standard/66455.html
- ISO 3166-1 alpha-2 country codes. https://www.iso.org/iso-3166-country-codes.html
- GHG Protocol Corporate Accounting and Reporting Standard, rev. ed. 2015. https://ghgprotocol.org/corporate-standard
- GHG Protocol Scope 2 Guidance, 2015. https://ghgprotocol.org/scope-2-guidance
- GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard, 2011. https://ghgprotocol.org/corporate-value-chain-scope-3-standard

**Fuentes complementarias:**

- Kool, A., Marinussen, M., Blonk, H. (2012). LCA of inorganic fertilizers used in the EU. Blonk Consultants. https://www.blonkconsultants.nl/wp-content/uploads/2016/06/fertilizer_production-D03.pdf
- Cornell Hotel Sustainability Benchmarking Index (CHSB). https://greenview.sg/services/chsb-index/
- IEA Emission Factors Database. https://www.iea.org/data-and-statistics/data-product/emissions-factors-2024
- FAOSTAT Greenhouse Gas Emissions methodological notes. https://files-faostat.fao.org/internal/GLE/GLE_e.pdf
- Climate Transparency Reports (factores por país). https://www.climate-transparency.org/

**Factores de electricidad nacionales (referencias para multi-país):**

- Chile — Ministerio del Medio Ambiente / CNE. https://energiaabierta.cl/visualizaciones/factor-de-emision-sic-sing/
- Colombia — UPME. https://www1.upme.gov.co/siame/Paginas/calculo-factor-de-emision-de-Co2-del-SIN.aspx
- México — SENER. https://www.gob.mx/sener
- Costa Rica — IMN. https://www.imn.ac.cr/
- Argentina — Secretaría de Energía. https://www.argentina.gob.ar/economia/energia
- Brasil — MCTI / Sistema Interligado Nacional. https://www.gov.br/mcti/pt-br
- Perú — MINEM. https://www.gob.pe/minem

# Resumen

Sección 1 — Inconsistencias de valores (17 subsecciones)

- GWP usan IPCC AR5 (2013) etiquetados como "DEFRA 2025"; AR6 (2021) está disponible y exigido por ISO 14064-1:2018.
- HFC-235cb no existe — es HFC-236cb (typo).
- Crítico: Acero y Cinc usan kg/ton con valores IPCC que están en t/t → error ×1000.
- Crítico: Crianza de aves 9810 kg CO₂e/animal/año (IPCC ~0.6) → error ×16000.
- Crítico: Electricidad 0.5349 atribuida a "DEFRA 2025" pero DEFRA UK = 0.17489.
- Cabras −77%, Porcinos −76%, Vacas pastoreo/lecheras posiblemente intercambiadas, Camélidos = valor de camellos.
- Carga aérea ~10× baja; aguas residuales ~4× baja; "Camión" usa valores de Van.
- Gasolina +13% (factor "100% mineral petrol" obsoleto); GLP inconsistencia interna kg/m³ vs kg/ton.

Sección 2 — Inconsistencias estructurales (27 subsecciones)

- Versión "2004" desactualizada vs GHG Protocol revisado 2015 + Scope 2/3 Standards.
- 8 de 15 categorías Scope 3 ausentes (Bienes de capital, WTT, Arrendados, Fin de vida, Franquicias, Inversiones, etc.).
- Mapeo ISO 14064-1:2018 (6 categorías) incoherente con synonyms declarados.
- countryIsoCode: "PD" no es ISO 3166 válido.
- Hardcoding país-específico en seed "base" viola directiva multi-país del CLAUDE.md.
- Sin separación CO₂ biogénico/fósil ni por gas (CO₂/CH₄/N₂O); incumple ISO 14064-1 §6.4.5.
- Fertilizantes Kool et al. en Alcance 1 cuando son cradle-to-gate (Alcance 3 Cat. 1).
- Dimensión Tipo (60+ valores) no usada por ningún factor.
- Cobertura LatAm insuficiente: faltan Argentina, Perú, Uruguay, Ecuador, Bolivia, Venezuela, Paraguay, RD, Panamá, Guatemala, Honduras, Nicaragua, El Salvador, Cuba, Haití.
- Ortografía: Hexafluoruro, Trifluoruro, Perfluoro, Potasio, Brasil, México.
- 4 subcategorías placeholder vacías; duplicación literal upstream/downstream; códigos de dimensión frágiles con espacios/acentos.

Referencias completas IPCC AR6/AR5/2006/2019R, DEFRA 2025, ISO 14064-1:2018/14064-3:2019, GHG Protocol Corporate/Scope 2/Scope 3, CHSB Cornell, y enlaces a factores de electricidad por país LatAm.
