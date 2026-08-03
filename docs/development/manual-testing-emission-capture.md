# Manual Testing — Emission Capture (Calculator Step 3)

A reproducible acceptance case for the **Emission Capture** screen (`/carbon-inventory/:id/emission-capture`), the most calculation-heavy screen in the platform. Use it to confirm, by hand and without reading code, that the calculator resolves factors and aggregates emissions correctly.

For the underlying model and formulas see [Emission Calculation Logic](../architecture/emission-calculation.md); for the automated API suite see the [Testing Guide](./testing.md). This document covers what those two do not: an end-to-end, human-verifiable check through the real UI.

**When to run it**

- After changing factor resolution, unit conversion, aggregation, or display formatting.
- After reseeding or editing the methodology (a factor change invalidates the expected values — see [Refreshing the fixture](#refreshing-the-fixture)).
- As a smoke test before a demo or a country deployment.

---

## How the screen computes

Per line:

```
line emissions (kg CO₂e) = quantity × applied factor
line emissions (t CO₂e)  = kg / 1000
```

Aggregation accumulates in **kg** and divides by 1000 only for display:

```
subcategory subtotal = Σ active lines
category total       = Σ subcategory subtotals
inventory total      = Σ the 3 category totals   (shown in step 4, not step 3)
```

### Factor resolution

The screen does not query `GET /emission-factors`. It reads the factor library from `GET /carbon-inventories/:id/methodology`, which returns each stored factor **plus a pre-generated variant for every compatible rate unit** (`getCarbonInventoryMethodology/helper.ts`).

The client then picks one:

1. The chosen **unit** determines the rate unit (`litros` → `kg/L`).
2. Factors are filtered by the selected dimension values **and** that rate unit.
3. If exactly one `source` remains, _Fuente factor_ and _Factor_ are auto-filled. If several remain, the source must be picked manually.

### Unit conversion

Conversions only happen **within the same magnitude** — a `kg/ton` factor is never converted to `kg/m3`. That is why the same fuel has separate stored factors for mass, volume and energy.

Since every numerator is `kg`, the derivation reduces to:

```
new factor = stored factor × baseFactor(new denominator) / baseFactor(stored denominator)
```

| Magnitude                              | Units (`baseFactor`)                      |
| -------------------------------------- | ----------------------------------------- |
| Mass                                   | g (1) · kg (1 000) · ton (1 000 000)      |
| Volume                                 | L (1) · m3 (1 000) · gal (3.78541)        |
| Distance                               | m (1) · km (1 000) · mi (1 609.34)        |
| Time                                   | h (1) · d (24)                            |
| Power                                  | kWh (1) · MWh (1 000)                     |
| Energy                                 | GJ (1)                                    |
| Animals / Area / Distance·Mass / Rooms | cant anim, ha, km-ton, pieza arre (all 1) |

### Display rounding (does not affect the maths)

Locale is **es-ES** → `.` for thousands, `,` for decimals.

- The **`Factor`** and **`Emisiones (tCO₂e)`** columns render at most **2 decimals**, dropping trailing zeros (`9,40` shows as `9,4`).
- Values under `0,01` widen to at most 6 decimals; under `0,000001` they render as `<0,000001`.
- **The computation always uses the full factor, never the displayed one.** In the fixture below, `0,01612 kg/km-ton` displays as `0,02` and `0,057 kg/h` as `0,06`. Reproducing the arithmetic from the screen alone will not match — use the _Exact factor_ column.

---

## Fixture — Lácteos del Valle S.A. (2025)

A fictional dairy processor, chosen because its plausible emission sources span all three categories and seven magnitudes, and because two of its lines force the unit-conversion path.

### Inventory profile (step 1)

| Field                     | Value                                  |
| ------------------------- | -------------------------------------- |
| Año de medición           | 2025                                   |
| Nombre borrador huella    | Huella 2025 - Lácteos del Valle        |
| Nombre de la organización | Lácteos del Valle S.A.                 |
| Tamaño                    | Mediana empresa II (100-249 empleados) |
| Rubro                     | Manufactura / Industria Manufacturera  |
| Sub-rubro                 | Alimentos y Bebidas - Lácteos          |
| Actividad principal       | litros producidos                      |
| Cantidad                  | 18500000                               |

Reach the screen via _Huella organizacional_ → **Nueva Huella** → **Quiero calcular mi huella** (that button sets `UsageMode.SIMPLIFIED`; _Ya tengo mis cálculos_ goes to Expert mode and does not apply here).

### Subcategories (step 2) — 11

Step 2 lists **every** subcategory of the methodology with an unchecked checkbox; the ones relevant to the sector carry a `Recomendada` badge (6 for Manufactura). All 11 below are ticked in the same list.

| Category                | Subcategory                                       | Rationale                               | Magnitude exercised      |
| ----------------------- | ------------------------------------------------- | --------------------------------------- | ------------------------ |
| 1 — Emisiones directas  | Combustiones estacionarias                        | Pasteurisation and hot-water boilers    | Volume + Mass            |
| 1 — Emisiones directas  | Combustiones móviles (flota propia)               | Delivery trucks and supervision pickups | Volume                   |
| 1 — Emisiones directas  | Emisiones fugitivas                               | Refrigerant top-ups in cold rooms       | Mass                     |
| 2 — Energías importadas | Electricidad                                      | Grid consumption                        | Power                    |
| 3 — Otras indirectas    | Productos comprados                               | PET and carton packaging                | Mass                     |
| 3 — Otras indirectas    | Disposición de residuos sólidos                   | Industrial waste and recycled plastic   | Mass                     |
| 3 — Otras indirectas    | Consumo de agua y tratamiento de aguas residuales | CIP washing and effluent                | Volume                   |
| 3 — Otras indirectas    | Desplazamiento diario de empleados                | Staff commuting                         | Distance                 |
| 3 — Otras indirectas    | Trabajo remoto de empleados                       | Partial remote work (admin)             | Time                     |
| 3 — Otras indirectas    | Viajes de negocios - Estadía                      | Hotels on commercial trips              | Rooms                    |
| 3 — Otras indirectas    | Transporte y distribución de bienes aguas arriba  | Imported packaging + raw-milk pickup    | Distance·Mass + Distance |

### Input recipe (step 3)

Type only **dimension(s) + Unidad + Cantidad**, in that order. _Fuente factor_ and _Factor_ auto-fill.

Quantities below are written exactly as they must be typed — no thousand separators. The field reformats them as you type (`12500` becomes `12.500`).

**Combustiones estacionarias** — `Tipo` is optional, `Combustible` required

| Tipo                     | Combustible | Unidad     | Cantidad |
| ------------------------ | ----------- | ---------- | -------- |
| Caldera de vapor         | Diésel      | litros     | 12500    |
| Caldera de agua caliente | GLP         | kilógramos | 3200     |

**Combustiones móviles (flota propia)**

| Tipo      | Combustible    | Unidad | Cantidad |
| --------- | -------------- | ------ | -------- |
| Camión    | Diésel         | litros | 28400    |
| Camioneta | Gasolina/Nafta | litros | 4600     |

**Emisiones fugitivas**

| Gas      | Unidad     | Cantidad |
| -------- | ---------- | -------- |
| HFC-134a | kilógramos | 45       |
| HFC-32   | kilógramos | 18       |

**Electricidad**

| Sistema eléctrico | Unidad         | Cantidad |
| ----------------- | -------------- | -------- |
| Sistema nacional  | megawatts hora | 1850     |

**Productos comprados**

| Material       | Destino                | Unidad    | Cantidad |
| -------------- | ---------------------- | --------- | -------- |
| Plástico       | Primera mano           | toneladas | 85       |
| Papel y cartón | Con material reciclado | toneladas | 140      |

**Disposición de residuos sólidos**

| Material                            | Destino           | Unidad    | Cantidad |
| ----------------------------------- | ----------------- | --------- | -------- |
| Residuos comerciales o industriales | Relleno sanitario | toneladas | 62       |
| Plástico                            | Reciclaje         | toneladas | 18       |

**Consumo de agua y tratamiento de aguas residuales**

| Fuente de suministro                | Unidad         | Cantidad |
| ----------------------------------- | -------------- | -------- |
| Consumo de agua                     | metros cúbicos | 46000    |
| Agua dispuesta en el alcantarillado | metros cúbicos | 38000    |

**Desplazamiento diario de empleados**

| Tipo       | Combustible | Unidad     | Cantidad |
| ---------- | ----------- | ---------- | -------- |
| Auto       | Gasolina    | kilómetros | 264000   |
| Bus urbano | No aplica   | kilómetros | 118000   |

**Trabajo remoto de empleados**

| Componente        | Unidad | Cantidad |
| ----------------- | ------ | -------- |
| Equipo de oficina | horas  | 21600    |
| Refrigeración     | horas  | 8400     |

**Viajes de negocios - Estadía**

| País   | Unidad            | Cantidad |
| ------ | ----------------- | -------- |
| Brasil | piezas arrendadas | 46       |
| España | piezas arrendadas | 22       |

**Transporte y distribución de bienes aguas arriba**

| Transporte             | Unidad              | Cantidad |
| ---------------------- | ------------------- | -------- |
| Contenedores por barco | kilómetros tonelada | 1240000  |
| Camión refrigerado     | kilómetros          | 96000    |

---

## Expected results

### Per line

`Exact factor` is what the engine multiplies by; `Shown factor` is the rounded value in the `Factor` column.

| Subcategory                | Line                                                    | Cantidad | Unidad              | Exact factor | Rate unit     | Source      | Shown factor | kg CO₂e     | `Emisiones (tCO₂e)` |
| -------------------------- | ------------------------------------------------------- | -------- | ------------------- | ------------ | ------------- | ----------- | ------------ | ----------- | ------------------- |
| Combustiones estacionarias | Caldera de vapor / Diésel                               | 12500    | litros              | 2.57         | kg/L          | DEFRA 2025  | 2,57         | 32 125      | **32,12** ⚠️        |
| Combustiones estacionarias | Caldera de agua caliente / GLP                          | 3200     | kilógramos          | 2.939        | kg/kg         | DEFRA 2025  | 2,94         | 9 404.8     | **9,4**             |
| Combustiones móviles       | Camión / Diésel                                         | 28400    | litros              | 2.57         | kg/L          | DEFRA 2025  | 2,57         | 72 988      | **72,99**           |
| Combustiones móviles       | Camioneta / Gasolina-Nafta                              | 4600     | litros              | 2.339        | kg/L          | DEFRA 2025  | 2,34         | 10 759.4    | **10,76**           |
| Emisiones fugitivas        | HFC-134a                                                | 45       | kilógramos          | 1 300        | kg/kg         | DEFRA 2025  | 1.300        | 58 500      | **58,5**            |
| Emisiones fugitivas        | HFC-32                                                  | 18       | kilógramos          | 677          | kg/kg         | DEFRA 2025  | 677          | 12 186      | **12,19**           |
| Electricidad               | Sistema nacional                                        | 1850     | megawatts hora      | 177          | kg/MWh        | DEFRA 2025  | 177          | 327 450     | **327,45**          |
| Productos comprados        | Plástico / Primera mano                                 | 85       | toneladas           | 3 172        | kg/ton        | DEFRA 2025  | 3.172        | 269 620     | **269,62**          |
| Productos comprados        | Papel y cartón / Con material reciclado                 | 140      | toneladas           | 1 068        | kg/ton        | DEFRA 2025  | 1.068        | 149 520     | **149,52**          |
| Disposición de residuos    | Residuos comerciales o industriales / Relleno sanitario | 62       | toneladas           | 520.5327     | kg/ton        | DEFRA 2025  | 520,53       | 32 273.0274 | **32,27**           |
| Disposición de residuos    | Plástico / Reciclaje                                    | 18       | toneladas           | 4.68568      | kg/ton        | DEFRA 2025  | 4,69         | 84.34224    | **0,08**            |
| Consumo de agua            | Consumo de agua                                         | 46000    | metros cúbicos      | 0.1913       | kg/m3         | DEFRA 2025  | 0,19         | 8 799.8     | **8,8**             |
| Consumo de agua            | Agua dispuesta en el alcantarillado                     | 38000    | metros cúbicos      | 0.17088      | kg/m3         | DEFRA 2025  | 0,17         | 6 493.44    | **6,49**            |
| Desplazamiento diario      | Auto / Gasolina                                         | 264000   | kilómetros          | 0.173        | kg/km         | DEFRA 2025  | 0,17         | 45 672      | **45,67**           |
| Desplazamiento diario      | Bus urbano / No aplica                                  | 118000   | kilómetros          | 0.117        | kg/km         | DEFRA 2025  | 0,12         | 13 806      | **13,81**           |
| Trabajo remoto             | Equipo de oficina                                       | 21600    | horas               | 0.057        | kg/h          | EcoAct 2020 | 0,06         | 1 231.2     | **1,23**            |
| Trabajo remoto             | Refrigeración                                           | 8400     | horas               | 0.122        | kg/h          | EcoAct 2020 | 0,12         | 1 024.8     | **1,02**            |
| Viajes - Estadía           | Brasil                                                  | 46       | piezas arrendadas   | 8.7          | kg/pieza arre | DEFRA 2025  | 8,7          | 400.2       | **0,4**             |
| Viajes - Estadía           | España                                                  | 22       | piezas arrendadas   | 7            | kg/pieza arre | DEFRA 2025  | 7            | 154         | **0,15**            |
| Transporte aguas arriba    | Contenedores por barco                                  | 1240000  | kilómetros tonelada | 0.01612      | kg/km-ton     | DEFRA 2025  | 0,02         | 19 988.8    | **19,99**           |
| Transporte aguas arriba    | Camión refrigerado                                      | 96000    | kilómetros          | 0.2482       | kg/km         | DEFRA 2025  | 0,25         | 23 827.2    | **23,83**           |

⚠️ `32,12` is expected, not a defect — see [float64 vs Decimal](#float64-vs-decimal).

The four factors that require conversion:

| Stored factor                  | Unit picked    | Applied factor    | Derivation                |
| ------------------------------ | -------------- | ----------------- | ------------------------- |
| Diésel · 2 570 `kg/m3`         | litros         | **2.57** `kg/L`   | 2 570 × 1 / 1 000         |
| Gasolina/Nafta · 2 339 `kg/m3` | litros         | **2.339** `kg/L`  | 2 339 × 1 / 1 000         |
| GLP · 2 939 `kg/ton`           | kilógramos     | **2.939** `kg/kg` | 2 939 × 1 000 / 1 000 000 |
| Electricidad · 0.177 `kg/kWh`  | megawatts hora | **177** `kg/MWh`  | 0.177 × 1 000 / 1         |

### Per subcategory

Shown in each subcategory header.

| Subcategory                                       | kg CO₂e      | t CO₂e (exact) | Header shows     |
| ------------------------------------------------- | ------------ | -------------- | ---------------- |
| Combustiones estacionarias                        | 41 529.8     | 41.5298        | **41,53 tCO₂e**  |
| Combustiones móviles (flota propia)               | 83 747.4     | 83.7474        | **83,75 tCO₂e**  |
| Emisiones fugitivas                               | 70 686       | 70.686         | **70,69 tCO₂e**  |
| Electricidad                                      | 327 450      | 327.45         | **327,45 tCO₂e** |
| Productos comprados                               | 419 140      | 419.14         | **419,14 tCO₂e** |
| Disposición de residuos sólidos                   | 32 357.36964 | 32.35736964    | **32,36 tCO₂e**  |
| Consumo de agua y tratamiento de aguas residuales | 15 293.24    | 15.29324       | **15,29 tCO₂e**  |
| Desplazamiento diario de empleados                | 59 478       | 59.478         | **59,48 tCO₂e**  |
| Trabajo remoto de empleados                       | 2 256        | 2.256          | **2,26 tCO₂e**   |
| Viajes de negocios - Estadía                      | 554.2        | 0.5542         | **0,55 tCO₂e**   |
| Transporte y distribución de bienes aguas arriba  | 43 816       | 43.816         | **43,82 tCO₂e**  |

### Per category and inventory total

Category totals appear in the `Total …` card at the top of each category tab.

| Category                                         | kg CO₂e             | t CO₂e (exact)     | Card shows         |
| ------------------------------------------------ | ------------------- | ------------------ | ------------------ |
| 1 — Emisiones directas                           | 195 963.2           | 195.9632           | **195,96 tCO₂e**   |
| 2 — Emisiones indirectas por energías importadas | 327 450             | 327.45             | **327,45 tCO₂e**   |
| 3 — Otras emisiones indirectas                   | 572 894.80964       | 572.89480964       | **572,89 tCO₂e**   |
| **TOTAL** (step 4 / step 5)                      | **1 096 308.00964** | **1 096.30800964** | **1.096,31 tCO₂e** |

Cross-checks: scope split ≈ 17.9 % / 29.9 % / 52.3 %; main-activity equivalence `1 096.30800964 / 18 500 000` renders as **0,000059 tCO₂e/litros producidos**.

---

## Navigation notes

- Step 3 shows **one category at a time** — the three cards at the top are tabs. The footer **Siguiente** button walks tab by tab and only advances to step 4 from Category 3.
- Within a category, subcategories are ordered **alphabetically**, not in methodology order. Category 3's real order is: Consumo de agua → Desplazamiento diario → Disposición de residuos → Productos comprados → Trabajo remoto → Transporte aguas arriba → Viajes de negocios - Estadía.
- Each subcategory starts with one empty line; use **Agregar Fuente** for each additional one.
- Step 3 also has an **Agregar subcategorías** button, so subcategories can be added without going back to step 2.
- `Cantidad` accepts a comma decimal separator (`12,5`) and formats thousands as you type (`12.500`).

### Fill order matters

Changing a **required dimension** or the **unit** clears the resolved factor (by design). The safe order is:

```
Dimensión 1 → Dimensión 2 → Unidad → Cantidad
```

If _Fuente factor_ / _Factor_ come up empty, the fields were filled in a different order — re-pick the unit.

---

## Known display artifacts

### float64 vs Decimal

Step 3 multiplies in JavaScript `Number` (float64) in the browser; the API stores the product as a `Decimal`. For quantities whose product is not exactly representable in binary:

```
12500 × 2.57 = 32124.999999999996   (not 32125)
→ / 1000      = 32.124999999999996
→ 2 decimals  = 32,12
```

So **step 3 shows `32,12` and step 4 shows `32,13` for the same line**, because step 4 reads the persisted `32125` kg. The gap is ±0.01 t on a single line; subtotals, category totals and the inventory total are identical either way in this fixture.

To prove the conversion engine is not at fault, re-enter the same physical consumption in the other unit: `12,5 metros cúbicos × 2 570 kg/m3` is exact in float64 and displays `32,13`, with the subtotal (`41,53`) and category total (`195,96`) unchanged.

### Rounded factor column

`Factor` renders 2 decimals, so `0,01612 kg/km-ton` reads as `0,02` and `0,057 kg/h` as `0,06`. The emissions those lines produce (`19,99` and `1,23`) are only reachable with the exact factor. This is a legibility trait, not a calculation bug, but it will mislead anyone recomputing from the screen.

---

## Verification

### Checklist

Step 3, per subcategory:

- [ ] Every line auto-filled _Fuente factor_ (`DEFRA 2025`, or `EcoAct 2020` for Trabajo remoto).
- [ ] Every line shows _Factor_ with the right rate unit (`kg/L`, `kg/MWh`, `kg/ton`, …).
- [ ] Every line's _Emisiones (tCO₂e)_ matches [Per line](#per-line).
- [ ] Each header subtotal matches [Per subcategory](#per-subcategory).

Step 3, category cards:

- [ ] Total emisiones directas = **195,96 tCO₂e**
- [ ] Total emisiones indirectas por energías importadas = **327,45 tCO₂e**
- [ ] Total otras emisiones indirectas = **572,89 tCO₂e**

Steps 4 and 5:

- [ ] Inventory total = **1.096,31 tCO₂e**
- [ ] Scope split ≈ 17.9 % / 29.9 % / 52.3 %

Robustness:

- [ ] Switch a line's unit (Diésel `litros` → `metros cúbicos`, quantity `12,5`) — subtotal and category total must not change.
- [ ] Delete a line — subtotal and category total must drop by exactly its contribution.
- [ ] Reload the page — persisted values must come back identical.

### Against the database

Run after step 3 has been saved (the sync fires when leaving the step). Adjust the inventory id.

```sql
SELECT c.position AS cat, c.name,
       SUM(lr.total_emissions) AS kg,
       ROUND(SUM(lr.total_emissions) / 1000, 8) AS ton
FROM carbon_inventory_line l
JOIN subcategory s ON s.id = l.subcategory_id
JOIN category c ON c.id = s.category_id
JOIN carbon_inventory_line_input ci ON ci.line_id = l.id AND ci.is_active
JOIN carbon_inventory_line_result lr ON lr.line_input_id = ci.id
WHERE l.carbon_inventory_id = 1
GROUP BY c.position, c.name
ORDER BY c.position;
```

Expected:

| cat | kg                 | ton          |
| --- | ------------------ | ------------ |
| 1   | 195 963.2000000000 | 195.96320000 |
| 2   | 327 450.0000000000 | 327.45000000 |
| 3   | 572 894.8096400000 | 572.89480964 |

To inspect line by line (quantity, applied factor, rate unit, result):

```sql
SELECT s.name AS subcat,
       COALESCE(dv1.value, '-') AS d1, COALESCE(dv2.value, '-') AS d2,
       mu.abbreviation AS unit, ci.quantity,
       lf.applied_factor_value AS factor, ru.abbreviation AS rate_unit,
       lr.total_emissions AS kg
FROM carbon_inventory_line l
JOIN subcategory s ON s.id = l.subcategory_id
JOIN carbon_inventory_line_input ci ON ci.line_id = l.id AND ci.is_active
LEFT JOIN emission_factor_dimension_value dv1 ON dv1.id = ci.selection_1_id
LEFT JOIN emission_factor_dimension_value dv2 ON dv2.id = ci.selection_2_id
LEFT JOIN measurement_unit mu ON mu.id = ci.measurement_unit_id
LEFT JOIN carbon_inventory_line_factor lf ON lf.line_input_id = ci.id
LEFT JOIN rate_measurement_unit ru ON ru.id = lf.applied_factor_rate_unit_id
LEFT JOIN carbon_inventory_line_result lr ON lr.line_input_id = ci.id
WHERE l.carbon_inventory_id = 1
ORDER BY s.id, dv1.value, dv2.value;
```

---

## Refreshing the fixture

The expected values are pinned to the seeded methodology (`Metodología inicial`, GHG Protocol 2004, País Demo — `tools/seed/src/data/base/methodologies.json`). **Any factor edit invalidates them.** To regenerate:

1. Dump the factors actually in the database:

   ```sql
   SELECT s.name AS subcat,
          COALESCE(dv1.value, '-') AS d1, COALESCE(dv2.value, '-') AS d2,
          ef.value, ru.abbreviation AS rate_unit, ef.source
   FROM emission_factor ef
   JOIN subcategory s ON s.id = ef.subcategory_id
   LEFT JOIN emission_factor_dimension_value dv1 ON dv1.id = ef.dimension_value_1_id
   LEFT JOIN emission_factor_dimension_value dv2 ON dv2.id = ef.dimension_value_2_id
   JOIN rate_measurement_unit ru ON ru.id = ef.rate_measurement_unit_id
   WHERE ef.status = 'ACTIVE'
   ORDER BY s.id, dv1.value, dv2.value;
   ```

2. For any line whose chosen unit differs from the stored factor's denominator, derive the applied factor with the formula in [Unit conversion](#unit-conversion).
3. Recompute `quantity × factor` per line, sum in kg, divide by 1000 only at the end, and update the three expected-results tables.
4. Re-render the display strings with the same formatter the UI uses: `Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })` — and mind that float64 rounding can shift a line by 0.01 (see [float64 vs Decimal](#float64-vs-decimal)).

Adding subcategories to the fixture is welcome; keep at least one line per magnitude and at least one line that forces a unit conversion.

---

## Related files

| Concern                       | Path                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Screen                        | `apps/web/src/screens/CarbonInventory/EmissionCaptureScreen.tsx`                                   |
| Grid, cells and columns       | `apps/web/src/screens/CarbonInventory/components/EmissionEditor/`                                  |
| Factor resolution (client)    | `apps/web/src/screens/CarbonInventory/components/EmissionEditor/services/emissionFactorService.ts` |
| Subcategory / category totals | `.../EmissionEditor/hooks/useEmissionSubcategoryTotal.ts`, `useEmissionCategoryTotal.ts`           |
| Pre-generated unit variants   | `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/helper.ts`                  |
| Persisted result              | `apps/api/src/features/carbonInventories/syncCarbonInventoryLines/helper.ts`                       |
| Display formatting            | `apps/web/src/utils/formatting.ts`, `apps/web/src/config/constants.ts`                             |
| Seeded methodology            | `tools/seed/src/data/base/methodologies.json`                                                      |
