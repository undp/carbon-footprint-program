# Reporte de consistencia — `methodologies.json` vs DEFRA 2025 / IPCC

Análisis de los 229 factores de emisión declarados en `packages/database/src/prisma/seeds/data/base/methodologies.json` (País Demo, metodología inicial) contra las fuentes citadas: DEFRA 2025 e IPCC 2006/2019.

## 1. Inventario de fuentes en el archivo

| Fuente declarada | # factores | Aplicación                                                                                                                                 |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| DEFRA 2025       | 195        | Combustión estacionaria/móvil, fugas (GWP), electricidad, productos, residuos, agua, commuting, viajes, transporte de carga, estadía hotel |
| IPCC             | 28         | Ganadería entérica, agricultura, procesos industriales (cinc, cemento, acero, vidrio)                                                      |
| EcoAct 2020      | 3          | Teletrabajo (equipo, calefacción, refrigeración)                                                                                           |
| Kool, A.         | 3          | Fertilizantes (N, P2O5, K2O)                                                                                                               |

## 2. Consistencia por categoría

### 2.1 Combustión estacionaria/móvil (DEFRA 2025) — mayormente consistente, con redondeos agresivos

| Combustible              | JSON     | DEFRA 2025 ref | Δ                                                                                                    |
| ------------------------ | -------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| Diésel kg/L (m³)         | 2570     | 2570.82        | ✓                                                                                                    |
| GLP kg/L (m³)            | 1557     | 1557.13        | ✓                                                                                                    |
| Kerosén kg/L             | 2540     | 2540.3         | ✓                                                                                                    |
| Gas natural kg/m³        | 2        | ~2.04          | ✓ (rounded)                                                                                          |
| Gasolina kg/L (m³)       | **2339** | **2069.16**    | ✗ +13% — corresponde a "100% mineral petrol" o valor histórico, no a la mezcla biocombustible actual |
| Fuel oil kg/L            | 3174     | ~3.175         | ✓                                                                                                    |
| Carbón industrial kg/t   | 2395     | ~2403          | ✓                                                                                                    |
| Carbón electricidad kg/t | 2225     | ~2253          | ✓                                                                                                    |
| Coke kg/t                | 3386     | ~3386          | ✓                                                                                                    |
| Diésel kg/kWh            | 0.25     | 0.24018        | +4% (redondeo)                                                                                       |
| Gas natural kg/kWh       | 0.20     | 0.18296        | +9% (redondeo alto)                                                                                  |
| GLP kg/kWh               | 0.23     | 0.22944        | ✓                                                                                                    |

**Bio (kg/GJ)**: Biodiésel 5.05, Bioetanol 0.42, Biogás 0.00022 kg/kWh — corresponden a fracción no biogénica (CH₄+N₂O) excluyendo CO₂ biogénico — convención DEFRA correcta.

### 2.2 GWP refrigerantes — etiquetados "DEFRA 2025" pero provienen de IPCC AR5

Todos los GWP100 coinciden 1:1 con IPCC AR5 (sin retroalimentación climática):

| Gas                                                                | JSON    | AR5     |
| ------------------------------------------------------------------ | ------- | ------- |
| CO₂                                                                | 1       | 1 ✓     |
| CH₄                                                                | 28      | 28 ✓    |
| N₂O                                                                | 265     | 265 ✓   |
| SF₆                                                                | 23500   | 23500 ✓ |
| NF₃                                                                | 16100   | 16100 ✓ |
| HFC-134a                                                           | 1300    | 1300 ✓  |
| HFC-23                                                             | 12400   | 12400 ✓ |
| HFC-125, 32, 152a, 143a, 227ea, 236fa, 245fa, 365mfc, 41, 43-10mee | todos ✓ |
| PFC-14, 116, 218, 318, 3-1-10, 4-1-12, 5-1-14, 9-1-18              | todos ✓ |

**Inconsistencia de atribución**: la fuente original es IPCC AR5 (2013), incorporada por DEFRA. La etiqueta correcta sería "IPCC AR5 (vía DEFRA 2025)".

**Error puntual**: `HFC-235cb` no existe en IPCC AR5. El valor 1210 corresponde a **HFC-236cb** — error tipográfico.

### 2.3 Ganadería — IPCC Tier 1 con GWP 28 (AR5), parcialmente consistente

Tabla 10.10 (IPCC 2006) + Tabla 10.11 (LatAm) ajustada a GWP 28:

| Animal              | JSON kg CO₂e | Esperado (Tier 1 LatAm × 28)               | Δ                                                                                                                  |
| ------------------- | ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Búfalos             | 1680         | ~1596 (55+2 kg CH₄)                        | +5% ✓                                                                                                              |
| Caballos            | 589.2        | ~565 (18+2.18)                             | +4% ✓                                                                                                              |
| Mulas/burros        | 327          | ~313 (10+1.19)                             | +4% ✓                                                                                                              |
| Ovejas              | 154.5        | ~146 (5+0.2)                               | +6% ✓                                                                                                              |
| Camélidos           | 1437.6       | ~1360 (camels 46+2.6) — **NO alpacas (8)** | el valor encaja con camellos, no con la fauna sudamericana (alpacas, llamas) que IPCC Tabla 10.10 fija en 8 kg CH₄ |
| Ciervos             | 600          | ~560 (20+ manure)                          | +7% ✓                                                                                                              |
| **Cabras**          | **35.17**    | ~145                                       | **−76% ✗** — valor implausible; podría ser sólo manure CH₄ y no entérico                                           |
| **Porcinos**        | **60**       | ~168 (1+5 kg)                              | **−64% ✗** — bajo respecto a IPCC LatAm warm                                                                       |
| **Crianza de aves** | **9810**     | IPCC no provee Tier 1 entérico/per-cabeza  | **✗** — valor sin respaldo IPCC, magnitud sólo plausible si la unidad fuera por flock o por ton, no per cabeza     |
| **Vacas pastoreo**  | **2190**     | ~1596 (Other cattle LatAm 56 kg)           | **+37%** — más alto que lo previsto                                                                                |
| **Vacas lecheras**  | **1710**     | ~2072 (Dairy LatAm 72 kg)                  | **−17%** — más bajo que lo previsto                                                                                |

**Problema clave**: en IPCC Tabla 10.11 LatAm, _dairy > beef_ (72 vs 56 kg CH₄). En el JSON, _pastoreo > lecheras_. Aparenta haber **intercambio de etiquetas**, o uso de fuente no-IPCC, o valores compuestos con manure muy diferentes a default warm-LatAm.

### 2.4 Procesos industriales

**Cemento** (Clinker 0.52 kg/kg) ✓ Coincide con IPCC default 0.52 t CO₂/t clinker.

**Vidrio** (kg/kg) ✓ Coincide con IPCC defaults: container 0.21, flat 0.21, fiber 0.19, lighting 0.20, tableware 0.10.

**Acero** — valores correctos pero **unidad INCORRECTA** (ver §3):

| Proceso | JSON          | IPCC 2006 Tabla 4.1   |
| ------- | ------------- | --------------------- |
| BOF     | 1.46 (kg/ton) | 1.46 **t/t**          |
| EAF     | 0.08          | 0.08 t/t              |
| OHF     | 1.72          | 1.72 t/t              |
| Otro    | 1.06          | 1.06 t/t (global avg) |

Los valores numéricos son IPCC defaults pero declarados como `kg/ton` (= 0.00146 t/t) cuando deberían ser `kg/kg` (= 1.46 t/t). **Factor 1000× de error si el motor de cálculo interpreta literalmente la unidad.**

**Cinc** — mismo patrón:

| Proceso         | JSON          | IPCC default                      |
| --------------- | ------------- | --------------------------------- |
| Waelz Kiln      | 3.66 (kg/ton) | 3.66 t/t                          |
| Pirometalúrgico | 0.43          | 0.43 t/t (electrotérmico)         |
| Otro proceso    | 1.72          | 1.72 t/t (Imperial Smelt Furnace) |

Mismo problema de unidad. Además, "Pirometalúrgico" en el JSON coincide numéricamente con el valor IPCC para **Electrotérmico**, y "Otro proceso" coincide con **Imperial Smelt Furnace** — etiquetas posiblemente desalineadas con el proceso real al que el factor IPCC se refiere.

### 2.5 Fertilizantes (Kool, A.)

3.53 (N) / 0.54 (P₂O₅) / 0.61 (K₂O) kg CO₂e/kg ✓ Coinciden con Kool et al. (2012) _LCA of inorganic fertilizers_ — fuente reconocida pero **no es IPCC ni DEFRA**.

### 2.6 Transporte de pasajeros — DEFRA 2025 ✓

Coches gasolina 0.173, diésel 0.166, eléctrico 0.047, híbrido 0.11; vuelos short-haul economy 0.1257, long-haul business 0.3165, etc. — coinciden todos con la tabla DEFRA 2025 _Business travel - air_ y _Passenger vehicles_.

### 2.7 Transporte de carga — valores sospechosos

| Modo                        | JSON    | DEFRA 2024/25 referencia                               |
| --------------------------- | ------- | ------------------------------------------------------ |
| Camión no refrigerado kg/km | 0.2115  | DEFRA "Vans Class III diesel" per vehicle-km = 0.21149 |
| Camión refrigerado kg/km    | 0.2482  | DEFRA "Refrigerated van" = 0.24823                     |
| Van combustión kg/km        | 0.06183 | parece ser per-tonne-km de van, no per vehicle-km      |
| Van eléctrica kg/km         | 0.03758 | similar                                                |

**Interpretación**: los factores etiquetados "Camión" coinciden con valores DEFRA de **vans**, no de HGVs. Un HGV diésel ronda 0.5–1.0 kg/km. **Mismatch de categoría**: los nombres dicen "Camión" pero los valores son de "Van Class III".

Carga aérea (kg/km-ton): Long haul 0.1351, Medium 0.1351, Short 0.2051 — muy por debajo de los defaults DEFRA para carga aérea (~0.5-2 kg/t-km). Probablemente provienen de una asignación bellyhold particular o una fuente distinta.

### 2.8 Electricidad — declarada "DEFRA 2025" pero el valor no es UK

Sistema nacional = 0.5349499999999999 kg/kWh. DEFRA 2025 UK grid = **0.177** kg/kWh. El valor 0.5349 es triple del UK y se aproxima a sistemas eléctricos más fósiles (Latam mix, México histórico, Chile pre-descarbonización). **Atribución incorrecta** — el factor no proviene de DEFRA.

### 2.9 Hospedaje hotel (DEFRA 2025)

Valores por país (UK, Alemania 13.2; Chile 27.6; Brasil 8.7; etc.) coinciden con la base de datos hotel DEFRA (que internamente proviene de **Cornell Hotel Sustainability Benchmarking, CHSB**). Atribución DEFRA es aceptable pero la cadena CHSB→DEFRA debería estar documentada.

---

## 3. Inconsistencias estructurales (no relacionadas con valores)

### 3.1 Unidades incorrectas para procesos metalúrgicos

- `Procesos industriales - Acero` y `Procesos industriales - Cinc` usan `rateMeasurementUnitAbbreviation: "kg/ton"` con valores que son ratios tonelada/tonelada (1.46, 3.66, etc.). Esto produce un error de **1000×** si la unidad se interpreta literalmente. Debe ser `kg/kg` (como cemento y vidrio).
- `Procesos industriales - Cemento`, `Vidrio` sí usan correctamente `kg/kg` con los mismos tipos de valores.

### 3.2 Atribución de fuentes

- 28 GWP de refrigerantes etiquetados "DEFRA 2025" cuando son IPCC AR5.
- 1 factor de electricidad etiquetado "DEFRA 2025" con valor incompatible con la red UK; se desconoce la fuente real.
- Hotel stay factors atribuyen a DEFRA pero la base subyacente es CHSB Cornell.

### 3.3 Errores tipográficos y de nomenclatura

- `"HFC-235cb"` → debe ser **HFC-236cb** (HFC-235cb no existe en AR5).
- `"Hexafloruro de azufre"` → **Hexafluoruro** (falta la `u`).
- `"Trifloruro de nitrogeno"` → **Trifluoruro de nitrógeno** (falta `u` y acento).
- `"Perfloruro ciclopropano"` → **Perfluorociclopropano**.
- `"Potacio (K2O)"` → **Potasio**.
- `"Brazil"` → **Brasil** (resto de países en español).
- `"EEUU"` → uso inconsistente vs el formato de los otros países.

### 3.4 Inconsistencia de género/concordancia

- `Auto Eléctrico` / `Moto Eléctrica` / `Taxi Eléctrico` — uno usa femenino, el resto masculino sin patrón claro. En el JSON sólo `Moto` lleva `"Eléctrica"` mientras Auto y Taxi llevan `"Eléctrico"`.

### 3.5 Precisión flotante

- Electricidad `"value": 0.5349499999999999` — error clásico de representación binaria. Debería almacenarse como `0.53495` (o, dado que el factor en sí es dudoso, revisarse).

### 3.6 Modelado de dimensiones

- En `Combustiones estacionarias` la dimensión `Tipo` (Caldera, Horno, etc.) está marcada `isRequired: false` y **nunca aparece como `dimensionValue1` en ningún factor** — todos los factores usan sólo `Combustible`. La dimensión `Tipo` queda como metadata descriptiva sin impacto en cálculo. Si es intencional, conviene documentarlo; si no, sobra.
- En `Subvariante` para commuting, el código dimensión es `"_Subvariante"` pero el `name` mostrado es `"Sub-variante"` (con guión). Inconsistencia interna.

### 3.7 Cobertura desigual por unidad

- Algunos combustibles tienen kg/kWh, kg/m³ y kg/ton (Diésel, Gasolina); otros sólo algunos (Biogás solo kg/kWh y kg/ton; Lubricantes sólo kg/m³).
- Bioetanol no tiene kg/L mientras Diésel y Gasolina sí. Inconsistencia de cobertura.

### 3.8 Duplicación implícita y valores "fallback"

- En `Disposición de residuos sólidos`, casi todas las combinaciones Material × {Incineración, Reciclaje} tienen el valor `4.68` repetido. Probablemente sea un transporte-a-instalación genérico, pero el patrón sugiere copy-paste; si fuera intencional, debería extraerse a un único factor reusable, no replicado 12 veces.

### 3.9 Subcategorías vacías

- `Emisiones provenientes de otras fuentes` (en Alcance 1 y Alcance 3), `Uso de productos de la organización` — tienen arrays vacíos para factores y dimensiones. Si son placeholders, conviene marcarlos como tales (flag, descripción) o eliminarlos hasta que se llenen.

### 3.10 Convención de nombres en `dimensionCode`

- Los `dimensionCode` repiten el nombre de la subcategoría: `"Combustiones estacionarias_Combustible"`, `"Desplazamiento diario de empleados y trabajo remoto_Subvariante"`. Tildes y espacios en identificadores generan strings frágiles. Convencional sería usar slugs `combustiones_estacionarias_combustible`. Si el sistema depende de matching exacto, cualquier renombre de subcategoría rompe los factores.

### 3.11 Mismatch categoría/valor en transporte

- "Camión" referenciando valores DEFRA de "Van Class III". Si el supuesto físico no es claro para el usuario final, los inputs se interpretarán mal.

### 3.12 País-agnosticismo (vs `CLAUDE.md`)

- "Sistema nacional" en electricidad con un único valor 0.5349 viola la directiva: este factor debería poblarse por país en seeds y no estar atado a un valor del "país demo" sin documentación de su origen.
- Lista de países en estadía (Australia, Tailandia, Vietnam, Indonesia…) duplica selectivamente países asiáticos pero omite muchos países Latam — para una plataforma Latam-agnóstica falta cobertura del continente target (Argentina, Perú, Uruguay, Ecuador, Bolivia, Venezuela, etc.).

---

## 4. Resumen ejecutivo

| Categoría             | Veredicto                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Combustión (DEFRA)    | Consistente, con redondeos. Gasolina kg/m³ está alto (~+13%).                                                          |
| GWP refrigerantes     | Valores IPCC AR5 correctos, **atribución a DEFRA es engañosa**. HFC-235cb es tipo.                                     |
| Ganadería             | Mayormente IPCC×28 LatAm, pero Cabras, Porcinos y Aves tienen valores fuera de rango; _dairy/beef parecen invertidos_. |
| Procesos industriales | Cemento y vidrio OK. **Acero y cinc tienen unidad equivocada (kg/ton vs kg/kg) — bug crítico**.                        |
| Fertilizantes         | Kool et al. correcto, atribución honesta.                                                                              |
| Transporte pasajeros  | DEFRA OK.                                                                                                              |
| Transporte carga      | **Mismatch categoría: "Camión" usa valores de "Van"**. Carga aérea inverosímilmente baja.                              |
| Electricidad          | **Valor no es UK, atribución a DEFRA es incorrecta**.                                                                  |
| Hotel                 | DEFRA aceptable pero cadena CHSB sin documentar.                                                                       |

### Acciones recomendadas (priorizadas)

1. **Crítico**: corregir unidad `kg/ton` → `kg/kg` en Acero y Cinc, o ajustar valores a 0.00146, 0.00366, etc.
2. **Crítico**: investigar el origen real del factor de electricidad 0.5349 y reatribuir.
3. **Alto**: verificar si Vacas pastoreo/lecheras están intercambiadas.
4. **Alto**: corregir o reemplazar valores anómalos de Cabras (35.17), Porcinos (60), Aves (9810).
5. **Alto**: realinear etiquetas "Camión"/"Van" con los valores DEFRA reales.
6. **Medio**: reatribuir GWP refrigerantes a IPCC AR5 (vía DEFRA 2025).
7. **Medio**: corregir typos (HFC-235cb→236cb, Potacio→Potasio, Hexafloruro→Hexafluoruro, Trifloruro→Trifluoruro, Brazil→Brasil).
8. **Bajo**: normalizar precision flotante 0.5349499999999999 → 0.53495.
9. **Bajo**: ampliar cobertura Latam en países de estadía.

---

## 5. Cruce con la fuente interna `Jerarquizacion_fuentes_emision_HC.drawio.html`

El diagrama drawio es la especificación de origen que alimenta `methodologies.json`. Esta sección compara JSON ↔ drawio (no contra DEFRA/IPCC) para distinguir bugs del JSON vs problemas heredados de la propia especificación.

### 5.1 Desviaciones del JSON respecto al drawio (bugs introducidos en el seed)

| Factor                 | Drawio                                                | JSON       | Comentario                                                                                                                                   |
| ---------------------- | ----------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Electricidad (kg/kWh)  | **0.17489** (DFRA, fila "Electricidad")               | **0.5349** | El drawio sí usa el factor DEFRA UK. El JSON lo reemplazó por 0.5349 sin documentar la fuente — confirma §2.8 como bug del seed, no del spec |
| Cabras (kg CO2e/cab)   | base 5.17 kg CH₄/animal → esperado ~145 (×28 +manure) | **35.17**  | Discrepancia ya marcada en §2.3; el drawio confirma que el factor base es 5.17, el JSON parece haber pegado "5.17" tras un "3" extraviado    |
| Crianza aves (kg CO2e) | base **0.02** kg CH₄/animal → esperado ~0.56          | **9810**   | Diferencia de ~17500×. El drawio define el factor por cabeza muy bajo; el JSON tiene un valor que no corresponde a ninguna unidad coherente  |

### 5.2 Discrepancias del informe que son en realidad heredadas del drawio (no son bugs del JSON)

| Tema                                | Hallazgo previo del informe                                               | Estado real                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Acero/Cinc unidad `kg/ton` vs `t/t` | §3.1 lo trata como bug del JSON                                           | El drawio también declara "Valor IPCC (kg CO2 / ton acero)" con valores 1.46/0.08/1.72/1.06 — el error está en el spec                |
| `HFC-235cb` (no existe en AR5)      | §2.2 marcado como typo del JSON                                           | El drawio lista explícitamente `HFC-235cb` — la tipografía proviene del spec                                                          |
| Vacas pastoreo > lecheras           | §2.3 marcado como posible intercambio de etiquetas                        | El drawio fija "Vacas pastoreo" = 73 y "Vacas lecheras" = 57 kg CH₄/animal — el JSON respeta el spec; el problema está en el spec     |
| "Camión" con valores de Van         | §2.7 / §3.11 marcado como mismatch                                        | El drawio rotula explícitamente "Camión no refrigerado" = 0.2115 y "Camión refrigerado" = 0.2482 — el rotulado erróneo viene del spec |
| Typos ortográficos                  | §3.3 lista "Potacio", "Hexafloruro", "Trifloruro", "Perfloruro", "Brazil" | Todos aparecen idénticos en el drawio                                                                                                 |
| `HFC-43-10mee` vs `HFC-43-I0mee`    | (no marcado en informe)                                                   | Drawio escribe `HFC-43-I0mee` (con i mayúscula). El JSON aparentemente lo corrigió a `10mee` con dígito                               |
| Cobertura selectiva de países hotel | §3.12 marcado como falla de país-agnosticismo                             | El drawio fija exactamente la misma lista (Australia, Tailandia, Vietnam, Indonesia, Otro Latam, Otro país)                           |

### 5.3 Alineamientos correctos JSON ↔ drawio (no son bugs)

- **Combustión estacionaria DFRA**: Gasolina/Nafta m³ 2339, Diésel m³ 2570, Queroseno m³ 2540, Fuel oil L 3174, Gas natural m³ ~2, GLP m³ 1557, Lubricantes m³ 2749, Combustible aviación m³ 2331 — todos coinciden con el drawio.
- **GWP refrigerantes**: CO₂=1, CH₄=28, HFC-23=12400, HFC-32=677, HFC-41=116, HFC-125=3170, HFC-134a=1300, HFC-143=328, HFC-143a=4800, HFC-152a=138, HFC-227ea=3350, HFC-236fa=8060, HFC-245fa=858, HFC-43-10mee=1650, HFC-152=16, PFC-14=6630, PFC-5-1-14=7910, PFC-9-1-18=7190, Perfloruro ciclopropano=9200, SF₆=23500, NF₃=16100 — coinciden 1:1.
- **Acero IPCC**: BOF 1.46, EAF 0.08, OHF 1.72, Default 1.06 — coinciden (con la unidad heredada errónea).
- **Cinc IPCC**: Waelz 3.66, Pirometalúrgico 0.43, Default 1.72 — coinciden.
- **Cemento clinker**: 0.52 ✓
- **Vidrio**: plano 0.21, contenedores transparentes 0.21, contenedores color 0.21, fibra 0.19, vajilla 0.10, iluminaria 0.20, general 0.21 — coinciden.
- **Fertilizantes**: N 3.53 / P₂O₅ 0.54 / K₂O 0.61 — coinciden.
- **Ganadería IPCC (base × 28 × ~1.07 incluye manure)**: Búfalos 56→1680, Caballos 19.64→589.2, Mulas 10.9→327, Ovejas 5.15→154.5, Camélidos 47.92→1437.6, Ciervos 20→600, Porcinos 2→60, Vacas pastoreo 73→2190, Vacas lecheras 57→1710 — las relaciones JSON = drawio × 28 × ~1.07 son consistentes (excepto Cabras y Aves, §5.1).
- **Agua**: consumida 0.1913, desechada 0.1708 kg CO2/m³ — coinciden.
- **Carga**: Tren 0.00691, Contenedores barco 0.00365, Granel barco 0.0008, Avión short 0.2051 / medium 0.1351 / long 0.1351, Camión no refrig 0.2115, Camión refrig 0.2482, Van eléctrica 0.03758, Van combustión 0.06183 — coinciden.
- **Hotel por país**: todos los valores y la lista de países coinciden.
- **Residuos sólidos**: el patrón "4.68" replicado proviene del drawio, no es copy-paste del seed.
- **Teletrabajo (EcoAct 2020)**: el factor `0.0314 + acondicionamiento × 0.3023` está documentado en el drawio (fórmula explícita). Los 3 factores que el seed atribuye a EcoAct 2020 derivan de esa fórmula.
- **Agricultura**: Cultivo general 8 (templado) / 16 (tropical) kg N₂O/ha — coincide con el drawio.

### 5.4 Conclusión del cruce con el drawio

- **3 bugs introducidos en el JSON respecto al drawio**: electricidad 0.5349 (drawio: 0.17489), cabras 35.17 (drawio implica ~145), crianza de aves 9810 (drawio implica ~0.56). Estos son los únicos hallazgos del informe que califican como bugs del seed seguidos por punto.
- **Resto de §2 y §3 (acero/cinc, HFC-235cb, dairy/beef invertido, "Camión"=Van, typos, cobertura Latam)** son inconsistencias del **drawio** que el JSON simplemente refleja con fidelidad. Para resolverlas hay que corregir primero el documento fuente (drawio) y reseed, no parchar el JSON.
- **Atribución a DEFRA de GWP refrigerantes** (§2.2): el drawio tampoco aclara que los GWP vienen de IPCC AR5; el rótulo "DFRA" para refrigerantes está en el drawio.
- **Hotel CHSB**: el drawio sólo rotula "DFRA"; la cadena CHSB no está documentada en el spec.

### 5.5 Acciones recomendadas actualizadas

1. **Crítico (seed bug)**: corregir `methodologies.json` para usar electricidad 0.17489 (alinear con drawio) o documentar por qué se sobrescribió.
2. **Crítico (seed bug)**: revisar y corregir Cabras (35.17) y Crianza de aves (9810) en el seed para que coincidan con el drawio (~145 y ~0.56 respectivamente) o sustentar la divergencia.
3. **Crítico (spec)**: corregir en el drawio la unidad de Acero/Cinc a `kg/kg` o ajustar valores, y reseed.
4. **Alto (spec)**: corregir en el drawio HFC-235cb → HFC-236cb (1210 → 1210 sigue válido para 236cb en AR5), y typos `HFC-43-I0mee` → `HFC-43-10mee`, "Potacio"→"Potasio", "Hexafloruro"→"Hexafluoruro", "Trifloruro"→"Trifluoruro", "Perfloruro ciclopropano"→"Perfluorociclopropano", "Brazil"→"Brasil".
5. **Alto (spec)**: validar con la fuente metodológica si "Vacas pastoreo"=73 y "Vacas lecheras"=57 efectivamente están invertidos en el drawio.
6. **Alto (spec)**: renombrar en el drawio "Camión" a "Van" o reemplazar valores por HGV reales (DEFRA 0.5–1.0 kg/km).
7. **Medio (spec)**: reatribuir en el drawio GWP refrigerantes a "IPCC AR5 (vía DEFRA)" y hotel a "DEFRA (datos CHSB Cornell)".
8. **Medio (spec)**: ampliar cobertura Latam en hotel desde el drawio (Argentina, Perú, Uruguay, Ecuador, Bolivia, Venezuela…).
9. **Bajo (seed)**: normalizar precisión flotante `0.5349499999999999` → `0.53495` (o eliminar al corregir §5.1 #1).

---

## Fuentes consultadas

- DEFRA 2025 GHG Conversion Factors — https://carbonpass.co/guides/defra-emission-factors-2025-uk
- DESNZ release notes — https://circularecology.com/news/desnz-defra-2025-ghg-emissions-factors-released
- GOV.UK 2025/2024 conversion factors collection — https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024 y https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
- DEFRA 2025 methodology paper — https://assets.publishing.service.gov.uk/media/6846b0870392ed9b784c0187/2025-GHG-CF-methodology-paper.pdf
- Zeppelin Sustainability Report 2024 (DEFRA 2023 reference table) — https://sustainabilityreport.zeppelin.com/2024/appendix/conversion-factors-co2-emissions/
- IPCC 2006 Guidelines Vol. 4 Ch. 10 (Livestock & Manure Management), Tablas 10.10 y 10.11 — https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_10_Ch10_Livestock.pdf
- IPCC 2006 Guidelines Vol. 3 Ch. 4 (Metal Industry Emissions), Tabla 4.1 (steel) y 4.24 (zinc) — https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_4_Ch4_Metal_Industry.pdf
- IPCC 2006 Vol. 3 Ch. 2 (Mineral Industry, cement) — https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_2_Ch2_Mineral_Industry.pdf
- IPCC 2019 Refinement Vol. 4 Ch. 10 — https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch10_Livestock.pdf
- FAOSTAT GLE methodological note (IPCC Tier 1 application) — https://files-faostat.fao.org/internal/GLE/GLE_e.pdf
- AgLEDx UNFCCC guidance enteric fermentation — https://agledx.ccafs.cgiar.org/estimating-emissions/unfccc-guidance/enteric-fermentation/
