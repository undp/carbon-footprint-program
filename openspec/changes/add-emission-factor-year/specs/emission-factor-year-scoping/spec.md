## ADDED Requirements

### Requirement: Every emission factor declares the footprint year it applies to

`EmissionFactor` SHALL carry a required `year` field. A factor SHALL apply only to footprints of that year. There SHALL be no undated factor: an administrator who considers a factor still applicable to a later year SHALL say so by dating a factor for that year.

`year` SHALL mean the footprint year the factor is valid for, and SHALL be independent of `source`, which is a free-text label naming the factor or the edition it came from. An administrator MAY name a factor `"DEFRA 2025"` and declare it valid for 2026.

The existing catalogue SHALL be dated by migration to the year it serves, without rewriting any `source` string, so each row keeps its edition in the name while stating its validity in the column.

The maintainer SHALL offer `[currentYear - 4 .. currentYear + 1]` in its year field, sharing its lower bound with the footprint year selector so that every declarable footprint year is datable, with one year of forward slack for sets published ahead of their validity. The request schemas SHALL enforce only a wide static bound, so that a factor does not become uneditable merely because the sliding window moved past its year.

A factor whose year falls outside that window SHALL still display its year and remain editable: its own year SHALL be offered as an option of its row.

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

#### Scenario: A year outside the offered window is still shown

- **GIVEN** a factor whose year falls outside the window the maintainer offers
- **WHEN** the maintainer grid renders that factor
- **THEN** its year SHALL be displayed rather than left blank, AND SHALL be selectable on that row

### Requirement: The migration leaves existing footprints in a state the new rules describe

Dating the catalogue SHALL NOT be assumed to fix the footprints that already used it. In the same migration, **every** footprint whose year differs from the catalogue's year SHALL have the factor snapshots and computed results of its catalogue-backed lines removed, regardless of whether it is editable, submitted or verified, so that afterwards no footprint holds a catalogue factor from another year.

The clearing SHALL act on the active input of each affected line, covering `ACTIVE` and `OUTDATED` lines alike, and SHALL leave superseded input versions untouched.

It SHALL also remove the snapshots that lost their factor reference before this change existed — those with no `emissionFactorId` whose frozen source is not one of the custom sources — since those are catalogue-backed lines damaged by an edit, not manual ones. No attempt SHALL be made to recover the lost reference.

Lines whose factor was entered manually SHALL be left untouched.

The migration SHALL record, in a comment, that erasing the factors of a submitted footprint destroys the record of what was declared and is admissible only because no footprint on the platform holds data declared in earnest.

#### Scenario: A footprint of another year is cleared whatever its state

- **GIVEN** a catalogue dated 2025, and footprints for 2024 holding catalogue factors — one editable, one submitted, one verified
- **WHEN** the migration runs
- **THEN** all three SHALL have those lines left with no factor snapshot and no result, AND each line SHALL keep its subcategory, dimension values, measurement unit and quantity, AND each footprint SHALL still be for 2024

#### Scenario: A footprint of the catalogue's own year is untouched

- **GIVEN** a catalogue dated 2025 and a footprint for 2025 holding catalogue factors
- **WHEN** the migration runs
- **THEN** its snapshots and results SHALL be unchanged

#### Scenario: Superseded input versions survive the clearing

- **GIVEN** a line of a 2024 footprint that has been saved more than once, so it has one active input and at least one inactive one
- **WHEN** the migration runs
- **THEN** the active input SHALL have no factor snapshot and no result, AND the inactive inputs SHALL keep theirs

#### Scenario: A manual factor survives the migration

- **GIVEN** a line of a 2024 footprint whose factor was entered with a custom source
- **WHEN** the migration runs
- **THEN** that line SHALL keep its snapshot, its manual value and its manual source

#### Scenario: A damaged snapshot is cleared rather than recovered

- **GIVEN** a line of a 2024 footprint whose snapshot has no factor reference but whose frozen source names a catalogue source
- **WHEN** the migration runs
- **THEN** that snapshot and its result SHALL be removed, AND no attempt SHALL have been made to re-link it to a factor

### Requirement: A line keeps its factor identity through editing

A line captured against a catalogue factor SHALL keep the reference to that factor across subsequent edits. Editing any other field of the line SHALL NOT turn it into a line with no catalogue factor.

The line as returned by the API SHALL carry the identifier of the factor its snapshot references, so the capture screen can preserve it. Without it the client has nothing to preserve, and the reference is lost on the next save.

Snapshots that already lost their reference SHALL be removed by the migration rather than re-linked.

#### Scenario: The line carries its factor's identifier

- **GIVEN** a line whose snapshot references a catalogue factor
- **WHEN** its footprint is requested
- **THEN** the line SHALL carry that factor's identifier

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

### Requirement: Line synchronization reconciles a line whose factor is of another year

When a line references a catalogue factor, the server SHALL read that factor from the database. When its year differs from the footprint's year, the line SHALL be persisted **without** a factor snapshot and without a computed result, keeping its subcategory, dimension values, measurement unit, quantity, comment and files, so the line returns to asking for a factor. The request SHALL NOT be rejected, and no other line SHALL be affected.

The response SHALL identify the lines left without a factor, so the user is told in Spanish which ones must be reassigned rather than discovering it silently.

Lines whose factor was entered manually SHALL be untouched by this rule.

The rule SHALL apply identically on creation and on update.

The year SHALL NOT be frozen on the line. This reconciliation, the clearing on a year change and the preserved factor identity together keep a catalogue-backed line on its footprint's year, so that year is derived rather than stored.

#### Scenario: A line referencing a factor from another year is saved without it

- **GIVEN** a footprint for year 2026 and a factor with `year = 2024`
- **WHEN** a sync request creates a line referencing that factor
- **THEN** the request SHALL succeed, AND the line SHALL be persisted with its subcategory, dimension values, measurement unit and quantity and with no factor snapshot and no result, AND the response SHALL identify that line as left without a factor

#### Scenario: The rest of the payload is persisted normally

- **GIVEN** a footprint for year 2026 and a sync request carrying one line with a factor of 2024 and another with a factor of 2026
- **WHEN** the request is processed
- **THEN** the 2026 line SHALL be persisted with its factor snapshot and result, AND only the other SHALL be reported as left without a factor

#### Scenario: The same rule applies when updating a line

- **GIVEN** a footprint for year 2026 with an existing line
- **WHEN** a sync request updates that line to reference a factor with `year = 2024`
- **THEN** the line SHALL be persisted with no factor snapshot and no result, AND SHALL be reported as left without a factor

#### Scenario: A line of the footprint's year is accepted

- **GIVEN** a footprint for year 2026 and a factor with `year = 2026`
- **WHEN** a sync request creates a line referencing that factor
- **THEN** the line, its input, its factor snapshot and its result SHALL be persisted

#### Scenario: A factor moved to another year by an administrator

- **GIVEN** a line of a 2026 footprint referencing a factor that an administrator has since re-dated to 2027
- **WHEN** the user saves that subcategory again
- **THEN** the save SHALL succeed, AND that line SHALL be left without a factor and reported as such, AND the other lines SHALL be unaffected

### Requirement: Changing a footprint's year clears the catalogue factors of its lines

Editing a footprint's year SHALL warn the user before the change is applied when the footprint already has declared lines. The warning SHALL be raised on every path that saves the year, including both advancing from the step and saving it on the way out.

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
