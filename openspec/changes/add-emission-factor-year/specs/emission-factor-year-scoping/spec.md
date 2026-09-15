## ADDED Requirements

### Requirement: An emission factor declares the footprint year it applies to

`EmissionFactor` SHALL carry a nullable `year` field. A factor with a year SHALL apply only to footprints of that year. A factor without a year SHALL apply to footprints of any year, preserving the behaviour of the entire catalogue as it exists before this change.

`year` SHALL mean the footprint year the factor is valid for, and SHALL be independent of `source`, which is a free-text label naming the factor or the edition it came from. An administrator MAY name a factor `"DEFRA 2025"` and declare it valid for 2026.

The year accepted by the maintainer SHALL be bounded to `[currentYear - 4 .. currentYear + 1]`, shared with the footprint year selector so that every declarable footprint year is datable, with one year of forward slack for sets published ahead of their validity.

#### Scenario: An undated factor is offered to a footprint of any year

- **WHEN** a footprint for year 2024 requests its methodology
- **THEN** every ACTIVE factor with `year = NULL` for its subcategories SHALL be offered, exactly as before this change

#### Scenario: A dated factor is offered only to its own year

- **GIVEN** a factor with `year = 2026`
- **WHEN** a footprint for year 2024 requests its methodology
- **THEN** that factor SHALL NOT appear among the offered factors

#### Scenario: The maintainer rejects a year outside the bounded range

- **WHEN** an administrator submits an emission factor with a year below `currentYear - 4` or above `currentYear + 1`
- **THEN** the request SHALL be rejected with a validation error, and no factor SHALL be created or updated

### Requirement: Uniqueness accounts for the year across all enforcement layers

Emission-factor uniqueness SHALL admit one factor per `(subcategory, required dimension values, year)`. `checkDuplicateEmissionFactor` SHALL include the year in its key, and remains the authoritative check because it is stricter than the database index.

`validateSourceConsistency` SHALL require a single `source` per `(subcategory, year)` rather than per subcategory, so that a catalogue loaded for a new year can carry its own citation without conflicting with a previous year's.

The partial unique index on `emission_factor` SHALL include the year as `COALESCE(year, 0)`, so that adding a nullable column does not cause Postgres' default `NULLS DISTINCT` behaviour to silently void the existing uniqueness of the undated catalogue.

#### Scenario: Two factors for the same key in different years coexist

- **GIVEN** an ACTIVE factor for a subcategory and its required dimension values with `year = 2025`
- **WHEN** an administrator creates a factor for the same subcategory and dimension values with `year = 2026`
- **THEN** the creation SHALL succeed, and both factors SHALL remain ACTIVE

#### Scenario: Two factors for the same key in the same year are rejected

- **GIVEN** an ACTIVE factor for a subcategory and its required dimension values with `year = 2026`
- **WHEN** an administrator creates a second factor for the same subcategory and dimension values with `year = 2026`
- **THEN** the request SHALL be rejected as a duplicate

#### Scenario: Different sources in the same subcategory and year are rejected

- **GIVEN** an ACTIVE factor for a subcategory with `source = "DEFRA 2026"` and `year = 2026`
- **WHEN** an administrator creates a factor for the same subcategory with `source = "IPCC 2020"` and `year = 2026`
- **THEN** the request SHALL be rejected with a source-conflict error

#### Scenario: Different sources across different years are allowed

- **GIVEN** an ACTIVE factor for a subcategory with `source = "DEFRA 2025"` and `year = 2025`
- **WHEN** an administrator creates a factor for the same subcategory with `source = "DEFRA 2026"` and `year = 2026`
- **THEN** the creation SHALL succeed

### Requirement: Capture offers only factors applicable to the footprint's year

The methodology returned for a footprint SHALL include only the factors whose year matches the footprint's year, plus those with no year. The filter SHALL be applied in the database query, before each factor is expanded across compatible rate units, so the expansion never operates on a factor from another year.

When both a dated and an undated factor exist for the same `(subcategory, dimension values, rate measurement unit)` key, the dated one SHALL take precedence and the undated one SHALL be omitted. This guarantees the capture screen still resolves a chosen source to exactly one factor, which it requires in order to auto-fill the value.

When the footprint has no year, only factors with no year SHALL be offered.

#### Scenario: The dated factor displaces the undated one on the same key

- **GIVEN** an undated factor and a `year = 2026` factor sharing subcategory, dimension values and rate measurement unit
- **WHEN** a footprint for year 2026 requests its methodology
- **THEN** only the `year = 2026` factor SHALL be offered for that key, AND selecting its source SHALL auto-fill the factor value

#### Scenario: The undated factor still serves a year that has no dated factor

- **GIVEN** an undated factor and a `year = 2026` factor sharing the same key
- **WHEN** a footprint for year 2024 requests its methodology
- **THEN** the undated factor SHALL be offered for that key

#### Scenario: A footprint with no year is offered only undated factors

- **GIVEN** a footprint whose `year` is NULL
- **WHEN** it requests its methodology
- **THEN** only factors with `year = NULL` SHALL be offered

### Requirement: Line synchronization validates the year and freezes it

`CarbonInventoryLineFactor` SHALL carry a nullable `applied_factor_year`, frozen at capture time alongside the value, source and rate unit it already freezes.

When a line references a catalogue factor, the server SHALL read that factor from the database and SHALL reject the request when its year is neither NULL nor equal to the footprint's year. The rule SHALL apply identically on creation and on update, with no exception for a factor the line already held — clearing the stale factors on a year change means no legitimate request ever carries a mismatched one. The year written to the snapshot SHALL come from the database row, never from the request payload.

When a line uses a custom factor source and therefore has no catalogue factor behind it, `applied_factor_year` SHALL be set to the footprint's year at the moment the line is created.

#### Scenario: A payload referencing a factor from another year is rejected

- **GIVEN** a footprint for year 2026 and a factor with `year = 2024`
- **WHEN** a sync request creates a line referencing that factor
- **THEN** the request SHALL be rejected, AND no line, input, factor snapshot or result SHALL be persisted for it

#### Scenario: The frozen year comes from the database, not the payload

- **GIVEN** a factor with `year = 2026`
- **WHEN** a sync request creates a line referencing it while claiming a different year in its payload
- **THEN** the persisted `applied_factor_year` SHALL be `2026`

#### Scenario: A manual factor freezes the footprint's year

- **GIVEN** a footprint for year 2023
- **WHEN** a line is created with a custom factor source and no catalogue factor
- **THEN** the persisted `applied_factor_year` SHALL be `2023`

### Requirement: Changing a footprint's year clears the catalogue factors of its lines

Editing a footprint's year SHALL warn the user before the change is applied when the footprint already has declared lines.

Once confirmed, every line whose frozen factor came from the catalogue SHALL have its factor snapshot and its computed result removed, so the line returns to asking for a factor. The line SHALL keep its subcategory, dimension values, measurement unit and quantity. A replacement factor SHALL NEVER be chosen automatically.

Lines whose factor was entered manually SHALL be left untouched, because their value and source were typed by the user and no catalogue can restore them.

The year change and the clearing SHALL be applied atomically.

Because the year is only editable while the footprint is editable, this clearing SHALL never affect a submitted or verified footprint.

#### Scenario: Duplicating a footprint keeps the frozen factors

- **WHEN** a footprint for year 2025 is duplicated
- **THEN** the copy SHALL be created for year 2025 with every line's factor snapshot copied verbatim, AND nothing SHALL be cleared

#### Scenario: Changing the year clears the catalogue factors

- **GIVEN** the duplicated footprint, whose lines froze catalogue factors with `applied_factor_year = 2025`
- **WHEN** its year is changed to 2026 and the user confirms
- **THEN** the user SHALL have been warned before the change was applied, AND each of those lines SHALL have no factor snapshot and no result, AND each SHALL keep its subcategory, dimension values, measurement unit and quantity, AND no replacement factor SHALL have been chosen for any of them

#### Scenario: A manual factor survives the year change

- **GIVEN** a line whose factor was entered with a custom source
- **WHEN** its footprint's year changes
- **THEN** that line SHALL keep its factor snapshot, its manual value and its manual source, AND the emission editor SHALL display the year frozen on it

#### Scenario: A line whose factor had no year is cleared like any other catalogue line

- **GIVEN** a line frozen with a catalogue factor whose `applied_factor_year` is NULL
- **WHEN** its footprint's year changes
- **THEN** that line SHALL be cleared, so the user picks again from the catalogue offered for the new year

### Requirement: The year survives methodology duplication, export and seeding

Duplicating a methodology version SHALL copy each factor's year to the new version. Both methodology export endpoints SHALL include the year for every factor. The seeded catalogue SHALL carry a year per factor.

#### Scenario: Duplicating a methodology preserves the dating

- **GIVEN** a methodology version whose factors carry years
- **WHEN** it is duplicated
- **THEN** each cloned factor SHALL carry the same year as its original

#### Scenario: Both exports carry the year

- **WHEN** a methodology is exported, either through the maintainer endpoint or through the footprint-scoped one
- **THEN** every exported factor SHALL include its year

### Requirement: The verifier's factor report reads the frozen snapshot

The per-footprint factor report SHALL report, for each line, the year and the source that were frozen at capture time, so a later edit to the catalogue cannot change what an already-submitted footprint reports.

#### Scenario: Editing a factor's source does not change an existing footprint's report

- **GIVEN** a footprint line captured with a factor whose source was `"DEFRA 2026"`
- **WHEN** an administrator later edits that factor's source
- **THEN** the footprint's factor report SHALL still show `"DEFRA 2026"`, together with the year frozen on the line
