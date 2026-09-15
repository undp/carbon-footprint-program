## ADDED Requirements

### Requirement: Every emission factor declares the footprint year it applies to

`EmissionFactor` SHALL carry a required `year` field. A factor SHALL apply only to footprints of that year. There SHALL be no undated factor: an administrator who considers a factor still applicable to a later year SHALL say so by dating a factor for that year.

`year` SHALL mean the footprint year the factor is valid for, and SHALL be independent of `source`, which is a free-text label naming the factor or the edition it came from. An administrator MAY name a factor `"DEFRA 2025"` and declare it valid for 2026.

The existing catalogue SHALL be dated by migration to the year it serves, without rewriting any `source` string, so each row keeps its edition in the name while stating its validity in the column.

The maintainer SHALL offer `[currentYear - 4 .. currentYear + 1]` in its year field, sharing its lower bound with the footprint year selector so that every declarable footprint year is datable, with one year of forward slack for sets published ahead of their validity. The API SHALL validate only a wide absolute bound, so that a factor does not become uneditable merely because the sliding window moved past its year.

#### Scenario: A factor is offered only to footprints of its own year

- **GIVEN** a factor with `year = 2026`
- **WHEN** a footprint for year 2024 requests its methodology
- **THEN** that factor SHALL NOT appear among the offered factors

#### Scenario: The migration dates the existing catalogue without touching its sources

- **WHEN** the migration runs against a database holding the undated catalogue
- **THEN** every existing emission factor SHALL end with the year the catalogue serves, AND no `source` string SHALL have been modified, AND the column SHALL be `NOT NULL` afterwards

#### Scenario: An edition can be declared valid for a later year

- **WHEN** an administrator creates a factor with `source = "DEFRA 2025"` and `year = 2026`
- **THEN** the creation SHALL succeed, AND the factor SHALL be offered to footprints of 2026 and to no other year

#### Scenario: A factor cannot be created without a year

- **WHEN** an administrator submits an emission factor with no year
- **THEN** the request SHALL be rejected, AND no factor SHALL be created

#### Scenario: An old factor stays editable after the window slides past it

- **GIVEN** a factor dated four or more years before the current year
- **WHEN** an administrator edits its value without changing its year
- **THEN** the update SHALL succeed

### Requirement: Uniqueness accounts for the year across all enforcement layers

Emission-factor uniqueness SHALL admit one factor per `(subcategory, required dimension values, year)`. `checkDuplicateEmissionFactor` SHALL include the year in its key, and remains the authoritative check because it is stricter than the database index.

`validateSourceConsistency` SHALL require a single `source` per `(subcategory, year)` rather than per subcategory, so that a catalogue loaded for a new year can carry its own citation without conflicting with a previous year's.

The partial unique index on `emission_factor` SHALL include the year as a plain column.

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

### Requirement: Capture offers only factors of the footprint's year

The methodology returned for a footprint SHALL include only the factors whose year equals the footprint's year. The filter SHALL be applied in the database query, before each factor is expanded across compatible rate units, so the expansion never operates on a factor from another year.

When the footprint has no year, no factors SHALL be offered.

#### Scenario: Only the footprint's year reaches capture

- **GIVEN** factors for the same subcategory dated 2025 and 2026
- **WHEN** a footprint for year 2026 requests its methodology
- **THEN** only the 2026 factor SHALL be offered, AND selecting its source SHALL auto-fill the factor value

#### Scenario: A year with no catalogue offers nothing

- **GIVEN** a catalogue dated 2025 only
- **WHEN** a footprint for year 2023 requests its methodology
- **THEN** no emission factors SHALL be offered for its subcategories, leaving the manual factor as the only path

#### Scenario: A footprint with no year is offered nothing

- **GIVEN** a footprint whose `year` is NULL
- **WHEN** it requests its methodology
- **THEN** no emission factors SHALL be offered

### Requirement: Line synchronization validates the year and freezes it

`CarbonInventoryLineFactor` SHALL carry a nullable `applied_factor_year`, frozen at capture time alongside the value, source and rate unit it already freezes.

When a line references a catalogue factor, the server SHALL read that factor from the database and SHALL reject the request when its year differs from the footprint's year. The rule SHALL apply identically on creation and on update — clearing the stale factors on a year change means no legitimate request ever carries a mismatched one. The year written to the snapshot SHALL come from the database row, never from the request payload.

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
