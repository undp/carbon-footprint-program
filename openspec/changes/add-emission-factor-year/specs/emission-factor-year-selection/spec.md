## ADDED Requirements

### Requirement: Capture ranks catalog vintages against the footprint year

For an activity with completed required dimensions, the platform SHALL filter catalog factors to the compatible numerator/denominator magnitude family and rank them against inventory year `Y` in this order:

1. factors whose `year = Y`;
2. transversal factors whose `year = null`;
3. factors at the greatest year below `Y`;
4. factors at the smallest year above `Y`.

The platform SHALL preselect a factor only when the winning rank contains exactly one candidate. If multiple providers remain in the winning rank, it SHALL preselect none and require the organization to choose. Database order, source text and factor ID SHALL NOT be used as implicit tie-breakers.

#### Scenario: One exact-year candidate exists

- **GIVEN** a 2023 footprint and one compatible candidate for each of 2022, 2023 and 2025
- **WHEN** the organization completes the activity's required fields
- **THEN** the 2023 factor SHALL be preselected

#### Scenario: A unique transversal candidate takes precedence over dated fallbacks

- **GIVEN** a 2023 footprint with one transversal candidate and dated candidates for 2022 and 2025
- **WHEN** the organization completes the activity's required fields
- **THEN** the transversal factor SHALL be preselected

#### Scenario: The nearest earlier year wins

- **GIVEN** a 2023 footprint with unique compatible candidates for 2020 and 2022 and no exact or transversal candidate
- **WHEN** the organization completes the activity's required fields
- **THEN** the 2022 factor SHALL be preselected

#### Scenario: The nearest later year is the last fallback

- **GIVEN** a 2022 footprint with unique compatible candidates for 2025 and 2027 only
- **WHEN** the organization completes the activity's required fields
- **THEN** the 2025 factor SHALL be preselected

#### Scenario: Equal-ranked providers require a choice

- **GIVEN** a 2023 footprint with both `DEFRA (2023)` and `IPCC (2023)` compatible with the activity
- **WHEN** the organization completes the activity's required fields
- **THEN** neither factor SHALL be preselected
- **AND** the organization SHALL be asked to choose between both labeled candidates

#### Scenario: Several transversal providers require a choice

- **GIVEN** a footprint with transversal factors labeled `IPCC` and `Kool, A.` as the winning compatible candidates
- **WHEN** the organization completes the activity's required fields
- **THEN** neither factor SHALL be selected arbitrarily

#### Scenario: No catalog factor is available

- **WHEN** no compatible factor exists for the completed activity
- **THEN** the platform SHALL preselect nothing
- **AND** the custom-factor flow SHALL remain available

#### Scenario: The inventory year is absent through a bypassed flow

- **GIVEN** the inventory has no measurement year
- **WHEN** the activity has one transversal candidate and one or more dated candidates
- **THEN** the unique transversal candidate MAY be preselected
- **AND** a dated factor SHALL NOT be selected implicitly without an inventory year

### Requirement: The existing Factor selector includes source and year in its option text

The capture screen SHALL keep the existing single selector labeled `Factor`; it SHALL NOT introduce a separate year/vintage selector. A dated canonical catalog factor SHALL use generated option text such as `DEFRA (2025)`. A transversal factor SHALL show only its source, such as `IPCC` or `Kool, A.`, without adding `(Transversal)`. The existing `Otro` option SHALL remain in the same selector and SHALL continue opening the custom-factor flow. Compatible converted units SHALL NOT appear as separate catalog factor options.

The organization SHALL be able to override a recommendation with any available candidate. A saved choice SHALL survive reload and SHALL remain selected if the inventory year later changes, until the organization replaces it explicitly.

#### Scenario: The organization overrides the recommendation

- **GIVEN** `DEFRA (2023)` is recommended and `DEFRA (2022)` is also available
- **WHEN** the organization chooses `DEFRA (2022)` and saves
- **THEN** the line SHALL use the 2022 factor
- **AND** the same choice SHALL be restored after reload

#### Scenario: The organization chooses between transversal providers

- **GIVEN** transversal factors labeled `IPCC` and `Kool, A.` are available
- **WHEN** the organization selects `Kool, A.`
- **THEN** that source SHALL be saved without assigning it a fabricated year

#### Scenario: Otro remains in the Factor selector

- **GIVEN** catalog factors such as `DEFRA (2025)` are listed in the `Factor` selector
- **WHEN** the organization selects `Otro`
- **THEN** the existing custom source, value and unit fields SHALL be shown
- **AND** no catalog year SHALL be assigned to the custom factor

### Requirement: The API is authoritative for catalog factor application

The line-sync contract SHALL use mutually exclusive factor variants:

```text
CATALOG { emissionFactorId, appliedRateMeasurementUnitId }
CUSTOM  { source, value, rateMeasurementUnitId }
DIRECT  { totalEmissions }
```

For `CATALOG`, the API SHALL load the selected factor and derive source, year, canonical value and converted applied value. It SHALL validate that the factor is ACTIVE, belongs to the inventory methodology and subcategory, matches the line's required dimensions, and belongs to the same numerator/denominator magnitude family as the requested applied rate unit. Client-authored catalog source, year or value SHALL NOT be accepted.

For `CUSTOM` and `DIRECT`, the API SHALL apply their dedicated validation and calculation paths. They SHALL NOT create a dated catalog-factor snapshot or participate in catalog-year warnings.

#### Scenario: A valid catalog factor is applied in a compatible unit

- **GIVEN** an ACTIVE canonical `DEFRA (2023)` factor in `kg/kWh` belongs to the inventory methodology
- **WHEN** the client submits its ID with a compatible mass/energy applied rate unit
- **THEN** the API SHALL convert the catalog value to that unit
- **AND** it SHALL calculate and persist the result and catalog snapshot from server-loaded data

#### Scenario: Client-authored catalog data cannot replace the snapshot

- **WHEN** a catalog selection request also attempts to provide a different value, source or year
- **THEN** request validation SHALL reject the unsupported fields or ignore them by construction
- **AND** the persisted snapshot SHALL come only from the selected catalog factor

#### Scenario: A factor from another methodology is rejected

- **GIVEN** a valid factor ID belongs to a methodology other than the inventory's methodology
- **WHEN** it is submitted as a `CATALOG` selection
- **THEN** the API SHALL reject the request without changing the line or result

#### Scenario: An incompatible unit family is rejected

- **GIVEN** the selected catalog factor is mass/energy
- **WHEN** the requested applied rate unit is mass/volume
- **THEN** the API SHALL reject the request instead of attempting a conversion

### Requirement: The applied catalog year is snapshotted and mismatch is derived

Each saved `CATALOG` line factor SHALL snapshot the selected factor's nullable year next to the existing applied value, unit and source. That snapshot SHALL remain unchanged if the catalog is later edited.

The platform SHALL derive whether a dated catalog factor differs from the footprint year by comparing `appliedFactorYear` with the current `carbon_inventory.year`. It SHALL NOT persist a fallback or year-match boolean.

#### Scenario: Catalog history remains reproducible

- **GIVEN** a saved line used `DEFRA (2022)`
- **WHEN** a maintainer edits that catalog row or adds a 2023 vintage
- **THEN** the saved line SHALL keep its applied value, unit, source and year snapshots

#### Scenario: Match state changes without rewriting the line

- **GIVEN** a saved line has `appliedFactorYear = 2022` and its inventory year is 2022
- **WHEN** the inventory year changes to 2023
- **THEN** the same snapshot SHALL now be derived as a mismatch
- **AND** no line-factor row SHALL be rewritten solely to update match state

### Requirement: Changing the inventory year preserves choices and results

Changing or re-dating an inventory SHALL retain every saved factor choice, applied snapshot and calculated result. The platform SHALL NOT offer or execute bulk factor re-resolution as part of the year change.

#### Scenario: A captured inventory is re-dated

- **GIVEN** a 2022 inventory with lines calculated using 2022 catalog factors
- **WHEN** the organization changes its year to 2023
- **THEN** every selected factor and result SHALL remain unchanged

#### Scenario: A duplicated inventory is assigned a new year

- **GIVEN** a copied inventory retains the source inventory's factors and results
- **WHEN** the organization assigns a different year to the copy
- **THEN** the copied factor snapshots and results SHALL remain unchanged until individually edited

### Requirement: Dated mismatches produce one non-blocking warning per subcategory

For each subcategory, an eligible line SHALL be an active line input with a saved catalog factor (`emissionFactorId != null`), a dated factor snapshot (`appliedFactorYear != null`) and a non-null current inventory year. A line SHALL be affected when its applied year differs from the inventory year.

The platform SHALL show the subcategory warning if and only if at least one eligible line is affected. It SHALL include the affected count, total eligible dated-catalog count, distinct mismatching factor years, current inventory year and a statement that calculations were not modified.

Transversal factors, custom/manual factors, direct totals, incomplete/no-factor lines and inactive/deleted inputs SHALL be excluded. The warning SHALL NOT block save, navigation or submission, and SHALL disappear when no eligible mismatch remains.

#### Scenario: A mixed subcategory shows an exact count

- **GIVEN** a 2023 inventory subcategory has eight eligible dated-catalog lines, three using 2021/2022 factors and five using 2023 factors
- **WHEN** the subcategory is displayed
- **THEN** one warning SHALL report that 3 of 8 dated-catalog lines use years 2021 and 2022 instead of 2023
- **AND** it SHALL state that calculations were not modified

#### Scenario: Excluded line types do not create false warnings

- **GIVEN** a 2023 subcategory contains a transversal catalog factor, a custom factor, a direct-total line, an incomplete line and a dated 2023 catalog factor
- **WHEN** the warning rule is evaluated
- **THEN** no warning SHALL be shown

#### Scenario: The warning is informational

- **GIVEN** a subcategory warning is visible
- **WHEN** the organization saves, navigates or submits the inventory without replacing the mismatched factors
- **THEN** the action SHALL remain allowed
- **AND** the selected factors and results SHALL remain unchanged

#### Scenario: Manual correction clears the warning

- **GIVEN** a subcategory warning identifies dated mismatches
- **WHEN** the organization individually replaces all affected factors with exact-year or transversal factors
- **THEN** the warning SHALL disappear after the lines are saved
