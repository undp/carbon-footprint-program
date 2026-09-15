## ADDED Requirements

### Requirement: Every emission factor declares the footprint year it applies to

`EmissionFactor` SHALL carry a required `year` field. A factor SHALL apply only to footprints of that year. There SHALL be no undated factor: an administrator who considers a factor still applicable to a later year SHALL say so by dating a factor for that year.

`year` SHALL mean the footprint year the factor is valid for, and SHALL be independent of `source`, which is a free-text label naming the factor or the edition it came from. An administrator MAY name a factor `"DEFRA 2025"` and declare it valid for 2026.

The existing catalogue SHALL be dated by migration to the year it serves, without rewriting any `source` string, so each row keeps its edition in the name while stating its validity in the column.

The maintainer SHALL offer `[currentYear - 4 .. currentYear + 1]` in its year field, sharing its lower bound with the footprint year selector so that every declarable footprint year is datable, with one year of forward slack for sets published ahead of their validity. The request schemas SHALL enforce only a wide static bound, so that a factor does not become uneditable merely because the sliding window moved past its year.

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

### Requirement: The migration leaves existing footprints in a state the new rules describe

Dating the catalogue SHALL NOT be assumed to fix the footprints that already used it. In the same migration, every **editable** footprint whose year differs from the catalogue's year SHALL have the factor snapshots and computed results of its catalogue-backed lines removed, by the same rule that a year change applies, so no editable footprint is left holding a total computed from factors it is no longer offered.

Submitted and verified footprints SHALL be left untouched, as the record of what was declared.

Duplicating a footprint whose year has no catalogue SHALL produce a copy whose catalogue-backed factor snapshots and results are already cleared, so the copy does not begin by rejecting its first save.

#### Scenario: An editable footprint of another year is cleared by the migration

- **GIVEN** an editable footprint for 2024 whose lines hold catalogue factors, and a catalogue dated 2025
- **WHEN** the migration runs
- **THEN** those lines SHALL have no factor snapshot and no result, AND SHALL keep their subcategory, dimension values, measurement unit and quantity, AND the footprint SHALL still be for 2024

#### Scenario: A submitted footprint keeps its declared calculation

- **GIVEN** a submitted or verified footprint for 2024
- **WHEN** the migration runs
- **THEN** its lines, snapshots and results SHALL be unchanged

#### Scenario: Duplicating a footprint of a year with no catalogue

- **GIVEN** a submitted footprint for 2024 and a catalogue dated 2025 only
- **WHEN** it is duplicated
- **THEN** the copy SHALL be for 2024 with its catalogue-backed factor snapshots and results already cleared, AND its manual-factor lines SHALL be copied intact

### Requirement: A line keeps its factor identity through editing

A line captured against a catalogue factor SHALL keep the reference to that factor across subsequent edits. Editing any other field of the line SHALL NOT turn it into a line with no catalogue factor.

The change SHALL state what becomes of the snapshots that already lost their reference before this rule existed.

#### Scenario: Editing an unrelated field preserves the factor reference

- **GIVEN** a line captured against a catalogue factor
- **WHEN** the user changes only its comment and saves
- **THEN** the new snapshot SHALL still reference the same catalogue factor

#### Scenario: An edited line is still treated as catalogue-backed

- **GIVEN** a line captured against a catalogue factor and since edited
- **WHEN** its footprint's year changes
- **THEN** that line SHALL be cleared like any other catalogue-backed line, and SHALL NOT be mistaken for a manual one

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

Because every returned factor is of the footprint's year by construction, the response SHALL NOT repeat the year per factor.

When the footprint has no year, the service SHALL return the methodology with no emission factors, through an explicit branch rather than a year filter — `year` is non-nullable, so no filter value can express "matches nothing".

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

### Requirement: Line synchronization validates the factor's year

When a line references a catalogue factor, the server SHALL read that factor from the database and SHALL reject the request when its year differs from the footprint's year. The rule SHALL apply identically on creation and on update — clearing the stale factors on a year change means no legitimate request ever carries a mismatched one.

The footprint SHALL be read inside the same transaction that writes the lines, and the year compared SHALL be the one read there, so a concurrent year change cannot be validated against a year that no longer holds by the time the write lands.

The year SHALL NOT be frozen on the line. The clearing rule, this validation and the preserved factor identity together keep a catalogue-backed line on its footprint's year, so that year is derived rather than stored.

#### Scenario: A payload referencing a factor from another year is rejected

- **GIVEN** a footprint for year 2026 and a factor with `year = 2024`
- **WHEN** a sync request creates a line referencing that factor
- **THEN** the request SHALL be rejected, AND no line, input, factor snapshot or result SHALL be persisted for it

#### Scenario: The same rule applies when updating a line

- **GIVEN** a footprint for year 2026 with an existing line
- **WHEN** a sync request updates that line to reference a factor with `year = 2024`
- **THEN** the request SHALL be rejected

#### Scenario: A line of the footprint's year is accepted

- **GIVEN** a footprint for year 2026 and a factor with `year = 2026`
- **WHEN** a sync request creates a line referencing that factor
- **THEN** the line, its input, its factor snapshot and its result SHALL be persisted

### Requirement: Changing a footprint's year clears the catalogue factors of its lines

Editing a footprint's year SHALL warn the user before the change is applied when the footprint already has declared lines.

Once confirmed, every line whose frozen factor came from the catalogue SHALL have its factor snapshot and its computed result removed, so the line returns to asking for a factor. The line SHALL keep its subcategory, dimension values, measurement unit and quantity. A replacement factor SHALL NEVER be chosen automatically.

The clearing SHALL reach parked lines as well as active ones. A line held as `OUTDATED` keeps its snapshot and can be reactivated without passing through line synchronization, so leaving it untouched would let a factor from another year walk back into an active footprint.

Lines whose factor was entered manually SHALL be left untouched, because their value and source were typed by the user and no catalogue can restore them.

The year change and the clearing SHALL be applied atomically.

Because the year is only editable while the footprint is editable, this clearing SHALL never affect a submitted or verified footprint.

#### Scenario: Duplicating a footprint keeps the frozen factors

- **WHEN** a footprint for year 2025 is duplicated
- **THEN** the copy SHALL be created for year 2025 with every line's factor snapshot copied verbatim, AND nothing SHALL be cleared

#### Scenario: Changing the year clears the catalogue factors

- **GIVEN** the duplicated footprint, whose lines hold catalogue factors
- **WHEN** its year is changed to 2026 and the user confirms
- **THEN** the user SHALL have been warned before the change was applied, AND each of those lines SHALL have no factor snapshot and no result, AND each SHALL keep its subcategory, dimension values, measurement unit and quantity, AND no replacement factor SHALL have been chosen for any of them

#### Scenario: A parked line is cleared too

- **GIVEN** a footprint whose non-direct lines are held as `OUTDATED` after switching a subcategory to total-manual mode
- **WHEN** its year changes and the user confirms
- **THEN** those parked lines SHALL have their catalogue-factor snapshots and results removed as well, so restoring them later cannot reintroduce a factor from another year

#### Scenario: A manual factor survives the year change

- **GIVEN** a line whose factor was entered with a custom source
- **WHEN** its footprint's year changes
- **THEN** that line SHALL keep its factor snapshot, its manual value and its manual source

### Requirement: The year survives methodology duplication, export and seeding

Duplicating a methodology version SHALL copy each factor's year to the new version. Both methodology export endpoints SHALL include the year for every factor. The seeded catalogue SHALL carry a year per factor.

#### Scenario: Duplicating a methodology preserves the dating

- **GIVEN** a methodology version whose factors carry years
- **WHEN** it is duplicated
- **THEN** each cloned factor SHALL carry the same year as its original

#### Scenario: Both exports carry the year

- **WHEN** a methodology is exported, either through the maintainer endpoint or through the footprint-scoped one
- **THEN** every exported factor SHALL include its year

### Requirement: The verifier's factor report reads the frozen source

The per-footprint factor report SHALL report, for each line, the source that was frozen at capture time, so a later edit to the catalogue cannot change what an already-submitted footprint reports.

The report SHALL NOT carry a year per row: it is scoped to one footprint, so the period is constant across its rows and established by the footprint itself.

The report collapses repeated uses of the same factor into one row. That collapsing SHALL key on what each line froze — the factor, its frozen source and its applied value — rather than on the factor alone, so two lines that froze different snapshots of the same factor each keep a row instead of one being dropped by line order.

#### Scenario: Editing a factor's source does not change an existing footprint's report

- **GIVEN** a footprint line captured with a factor whose source was `"DEFRA 2026"`
- **WHEN** an administrator later edits that factor's source
- **THEN** the footprint's factor report SHALL still show `"DEFRA 2026"`

#### Scenario: Two lines that froze different snapshots of one factor both appear

- **GIVEN** two lines of the same footprint that used the same factor, captured either side of an administrative edit to its source
- **WHEN** the factor report is requested
- **THEN** both frozen sources SHALL appear, as two rows
