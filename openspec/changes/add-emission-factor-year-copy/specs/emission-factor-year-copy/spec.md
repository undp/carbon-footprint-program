## ADDED Requirements

### Requirement: Administrators copy the emission factors of one year into another

The system SHALL provide `POST /api/emission-factors/duplicate-year`. It takes `methodologyVersionId`, `sourceYear`, `targetYear` and a list of per-factor `changes`, and creates the target-year factors of that methodology version from its source-year factors. Only users with the SUPERADMIN or ADMIN system role SHALL be allowed to call it.

#### Scenario: An admin copies a year without changes

- **WHEN** an ADMIN posts a methodology version, source year 2025, target year 2027 and no changes, and 2027 has no factors in that version
- **THEN** the response is 200 and every visible 2025 factor of that version exists as a new ACTIVE 2027 factor

#### Scenario: A regular user is refused

- **WHEN** a user with the USER role calls the endpoint
- **THEN** the response is 403 and no factor is created

#### Scenario: An anonymous caller is refused

- **WHEN** the endpoint is called without authentication
- **THEN** the response is 401 and no factor is created

### Requirement: The copy request is validated

The system SHALL answer 400 when the years are equal, when either is outside `EMISSION_FACTOR_YEAR_MIN`..`EMISSION_FACTOR_YEAR_MAX`, when there are more than 2000 changes, or when a change breaks the contract (a source that is empty once normalized, a malformed gas breakdown). A change's source SHALL be normalized as `EmissionFactorSourceSchema` stores it (trimmed, each whitespace run collapsed). It SHALL answer 404 `METHODOLOGY_NOT_FOUND` for a methodology version that does not exist or is DELETED. It SHALL accept a PUBLISHED version, as the single-row writes do.

#### Scenario: Same source and target year

- **WHEN** `sourceYear` and `targetYear` are both 2026
- **THEN** the response is 400 and no factor is created

#### Scenario: A blank source

- **WHEN** a change sets the source to `"   "`
- **THEN** the response is 400 and no factor is created

#### Scenario: Year out of bounds

- **WHEN** `targetYear` is below `EMISSION_FACTOR_YEAR_MIN` or above `EMISSION_FACTOR_YEAR_MAX`
- **THEN** the response is 400

#### Scenario: Unknown methodology version

- **WHEN** `methodologyVersionId` does not exist or is DELETED
- **THEN** the response is 404 `METHODOLOGY_NOT_FOUND`

#### Scenario: Published methodology version

- **WHEN** `methodologyVersionId` is the PUBLISHED version and its 2027 has no factors
- **THEN** the response is 200 and the 2026 factors exist as new ACTIVE 2027 factors of that version

### Requirement: Copied factors are faithful, independent rows

Each copied factor SHALL have the source factor's subcategory, dimension values and rate measurement unit. Its source, value and gas breakdown SHALL come from the factor's change when given, and otherwise from the source factor. It SHALL have the target year, status ACTIVE and the caller as creator. The source factors, the factors of other years and the factors of other methodology versions SHALL NOT change. Copied factors SHALL be editable and deletable like any factor not in use.

#### Scenario: Every field is copied

- **WHEN** a 2026 factor with both dimension values, a gas breakdown and a ten-decimal value is copied to 2027 without a change
- **THEN** the 2027 factor has a new id and equal subcategory, dimension values, rate unit, source, gas breakdown and value, and year 2027

#### Scenario: A change sets the value and the source

- **WHEN** the request changes the «Electricidad» «Sistema nacional» factor to value 0.207 and source "Red nacional 2027"
- **THEN** the 2027 factor has value 0.207 and source "Red nacional 2027", and the 2026 factor keeps its value and source

#### Scenario: The source year is untouched

- **WHEN** a copy from 2026 to 2027 completes
- **THEN** the 2026 factors have the same ids, values, sources and update timestamps as before

#### Scenario: Other methodology versions are untouched

- **WHEN** two methodology versions have 2026 factors and one of them is copied to 2027
- **THEN** the other version has no 2027 factors

#### Scenario: A copied factor can be edited

- **WHEN** an admin updates the value of a copied 2027 factor
- **THEN** the update succeeds and the 2026 factor keeps its value

#### Scenario: A factor locked by use is still copied

- **WHEN** a 2026 factor is used by a live footprint line, so the usage guard locks it, and 2026 is copied to 2027
- **THEN** its 2027 copy is created and can be edited

### Requirement: Factors can be left out of the copy

A change with `exclude` SHALL leave its source factor out of the copy, and any `value`, `source` or `gasDetails` in that change SHALL be ignored. Excluded factors SHALL be counted in `excludedCount`.

#### Scenario: Excluding a factor

- **WHEN** the request excludes the three «Trabajo remoto de empleados» factors
- **THEN** 2027 has no factor of that subcategory and `excludedCount` is 3

#### Scenario: Exclusion wins over other fields

- **WHEN** a change carries `exclude` and a `source` that another copied factor of the same row also has
- **THEN** the factor is not copied, the response is 200, and no `DUPLICATE_TARGET_FACTOR` is reported

### Requirement: The copy never overwrites an existing factor

A source factor SHALL be skipped, and counted in `skipped.existingCount`, when either of these holds:

- the target year already has an ACTIVE, visible factor with the same subcategory, dimension values (NULL equal to NULL) and rate measurement unit, whatever its value or source;
- the source factor has both dimension values set and the target year has a factor with the same subcategory and both dimension values in any rate unit.

Both rules SHALL leave out the source: a copy never adds a second source to a row the target year holds. A change to a skipped factor SHALL be ignored. Factors that differ only by rate measurement unit, by an optional dimension value or by source SHALL otherwise be copied as separate rows.

#### Scenario: An existing target factor is kept

- **WHEN** 2027 already has the «Electricidad» «Sistema nacional» factor with another value, and 2026 is copied to 2027 with a change to that factor's value
- **THEN** the 2027 factor keeps its value and `skipped.existingCount` counts it

#### Scenario: Rate-unit variants are all copied

- **WHEN** 2026 has Biodiésel factors in kg/GJ, kg/kg and kg/m3 for «Combustiones estacionarias» and 2027 has none
- **THEN** the copy creates all three 2027 factors

#### Scenario: A partially loaded target is completed

- **WHEN** 2027 already has the kg/GJ Biodiésel factor and 2026 has all three units
- **THEN** the copy creates the kg/kg and kg/m3 factors and skips the kg/GJ one

#### Scenario: The alternatives of one row are copied

- **WHEN** 2026 has two Biodiésel kg/GJ factors of «Combustiones estacionarias», one from "DEFRA 2026" and one from "IPCC 2006", and 2027 has none
- **THEN** the copy creates both 2027 factors, each with its source

#### Scenario: A row the target holds with another source is skipped

- **WHEN** 2027 already has the Biodiésel kg/GJ factor with source "Inventario nacional 2027" and 2026 has it with source "DEFRA 2026"
- **THEN** the 2026 factor is skipped and counted in `skipped.existingCount`

#### Scenario: A both-dimension factor in another unit is skipped

- **WHEN** 2027 has a factor with both dimension values in one rate unit, and 2026 has the same subcategory and dimension values in another rate unit
- **THEN** the 2026 factor is skipped and counted in `skipped.existingCount`, and the response is 200

### Requirement: A copy that would break the factor rules is refused as a whole

The system SHALL refuse the whole copy with 422 `EMISSION_FACTOR_YEAR_COPY_INVALID` when the resulting target year would break a rule, and SHALL write nothing. Each violation SHALL be listed in the error details with its reason and its source factor. A subcategory MAY cite several sources in a year. The rules are:

- no two copied factors with the same subcategory, dimension values, rate unit and source, nor, with both dimension values, the same subcategory, dimension values and source; sources SHALL compare as the single-row duplicate check compares them (whitespace and letter case aside); each factor of such a group is reported (`DUPLICATE_TARGET_FACTOR`);
- a gas breakdown that sums above zero matches the value within the factor tolerance (`GAS_DETAILS_MISMATCH`);
- a `sourceFactorId` is a visible source-year factor of the version (`UNKNOWN_SOURCE_FACTOR`);
- at most one change per source factor (`DUPLICATE_CHANGE`).

Every violation found SHALL be reported, not only the first. A change's value MAY be any number, as when creating a factor.

#### Scenario: A negative value is accepted

- **WHEN** a change sets a factor's value to -0.5
- **THEN** the copy succeeds and the 2027 factor has value -0.5

#### Scenario: A second source in one subcategory

- **WHEN** the request changes the source of one «Combustiones estacionarias» factor to "DEFRA 2027" and leaves the others on "DEFRA 2026"
- **THEN** the copy succeeds and 2027 has factors of that subcategory with both sources

#### Scenario: Two alternatives end with one source

- **WHEN** 2026 has two Biodiésel kg/GJ factors, from "DEFRA 2026" and "IPCC 2006", and the request changes the second one's source to "defra 2026"
- **THEN** the response is 422 with a `DUPLICATE_TARGET_FACTOR` detail for each of the two factors, and 2027 has no new factor

#### Scenario: Stray spaces are not a new source

- **WHEN** a change sets the source of one «Combustiones estacionarias» factor to `"  DEFRA   2027 "`
- **THEN** the copy succeeds and the copied factor has source "DEFRA 2027"

#### Scenario: A value that no longer matches its breakdown

- **WHEN** a source factor has a gas breakdown summing above zero and the change sets a different value without a new breakdown
- **THEN** the response is 422 with a `GAS_DETAILS_MISMATCH` detail for that factor

#### Scenario: Several violations are reported together

- **WHEN** the request both duplicates a change and breaks a gas breakdown
- **THEN** the 422 lists a `DUPLICATE_CHANGE` and a `GAS_DETAILS_MISMATCH` detail, and no factor is created

#### Scenario: A change for a factor outside the source year

- **WHEN** a change names a factor of 2025 or of another methodology version
- **THEN** the response is 422 with an `UNKNOWN_SOURCE_FACTOR` detail

### Requirement: Unusable source factors are not copied

The copy SHALL read only the factors the maintainer shows: ACTIVE, with each dimension value either NULL or ACTIVE under an ACTIVE dimension.

#### Scenario: A deleted subcategory

- **WHEN** a subcategory with 2026 factors is deleted, which deletes its factors, and 2026 is copied to 2027
- **THEN** none of its factors is copied and none is counted in any bucket

#### Scenario: A factor pointing to a deleted dimension value

- **WHEN** an ACTIVE 2026 factor references a DELETED dimension value, written directly in the database
- **THEN** it is not copied and is not counted in any bucket

### Requirement: The copy reports its result and can be repeated

The 200 response SHALL include `copiedCount`, `editedCount`, `excludedCount` and the `skipped` counts. `editedCount` SHALL count the copied factors whose value, source or gas breakdown differs from their source factor, values compared as numbers. Repeating a copy SHALL create no factor that already exists. A source year without factors SHALL answer 200 with `copiedCount` 0.

#### Scenario: A repeated copy

- **WHEN** the same copy from 2026 to 2027 is posted twice
- **THEN** the second response has `copiedCount` 0 and `skipped.existingCount` equal to the first `copiedCount`

#### Scenario: An empty source year

- **WHEN** 2024 has no factors and 2024 is copied to 2027
- **THEN** the response is 200 with `copiedCount` 0

### Requirement: The copy is atomic

The copy SHALL either create every factor it reports as copied or create none. A unique-index collision with a concurrent write SHALL answer 409 `EMISSION_FACTOR_YEAR_COPY_CONFLICT`, and nothing SHALL be written.

#### Scenario: The full catalogue in one operation

- **WHEN** the full testing catalogue's year is copied to an empty year
- **THEN** the response is 200 and `copiedCount` equals the number of visible factors in the source year

#### Scenario: A concurrent write collides

- **WHEN** the insert fails on the unique index because another write created a factor of the same key
- **THEN** the response is 409 `EMISSION_FACTOR_YEAR_COPY_CONFLICT` and the target year has no factor from the copy

### Requirement: The page and the API apply the same copy rules

A shared planner SHALL decide each source factor's outcome (copied, excluded, already in the target) and the rule violations. The copy page SHALL use it for its blockers and the API SHALL use it before writing. The planner and the single-row duplicate check SHALL use one shared definition of when two sources are the same.

#### Scenario: The page blocks what the API would refuse

- **WHEN** the planner reports `DUPLICATE_TARGET_FACTOR` for two factors on the page
- **THEN** the copy button is disabled, both source cells are marked, a notice above the grid counts them, and the same input posted to the API answers 422 with the same reason

#### Scenario: The single-row check and the copy agree on sources

- **WHEN** a 2027 factor exists with source "DEFRA 2027", and an admin creates in the maintainer a factor with the same key and source "defra 2027"
- **THEN** the create is refused as a duplicate, as the planner refuses two copied factors with those sources

### Requirement: The maintainer offers a copy page

The factor maintainer SHALL show a «Copiar factores» action only in edit mode, for any methodology version, the published one included. The action SHALL open a copy page for that version with:

- an «Origen» select listing the years with factors in the version;
- a «Destino» select listing the «Año» column's window except the source year;
- one data grid of every source-year factor, with a subcategory column and the target source and the target value editable per factor;
- the grid's own sorting, quick search and column filter, with the grid's Spanish texts.

#### Scenario: The action is hidden outside edit mode

- **WHEN** an admin views the factor maintainer without entering edit mode
- **THEN** the «Copiar factores» action is not shown

#### Scenario: The copy over the published version says it is live

- **WHEN** an admin opens the copy page in edit mode of the published version
- **THEN** the page states that what is copied is available at once to the footprints of the target year

#### Scenario: Filtering by subcategory

- **WHEN** the admin filters the subcategory column by «Electricidad»
- **THEN** the grid shows only that subcategory's factors, with its dimension names as column headers

#### Scenario: An existing target factor is read-only

- **WHEN** the target year already has a factor matching a source row
- **THEN** that row shows that it already exists in the target year and its cells cannot be edited

### Requirement: The copy page reads and shows numbers like the maintainer grid

The copy page SHALL read a typed target value in the app locale (decimal comma, dot as thousands separator) with up to `FACTOR_INPUT_DECIMAL_SCALE` decimals, and SHALL display every value (source values, target values of existing rows, variation tooltips) in the app locale without rounding. An emptied value cell SHALL block the copy.

#### Scenario: A thousands separator

- **WHEN** the admin types «1.000» as a target value
- **THEN** the planner and the request carry 1000

#### Scenario: A decimal comma

- **WHEN** the admin types «0,207» as a target value
- **THEN** the planner and the request carry 0.207

#### Scenario: A large stored value

- **WHEN** a source factor has value 1000000
- **THEN** its value is shown as «1.000.000», as in the maintainer grid

#### Scenario: An emptied value

- **WHEN** the admin clears a target value and leaves the cell
- **THEN** the cell shows why it blocks and the copy button is disabled

### Requirement: The copy page marks edits and warns about large changes

The copy page SHALL tint every row whose target value differs from its source value, and SHALL mark a changed target source in its cell. It SHALL warn, without blocking, about a changed value more than `EMISSION_FACTOR_COPY_WARNING_PERCENT` away from the source value, or `EMISSION_FACTOR_COPY_WARNING_RATIO` times larger or smaller. It SHALL lock the value of a factor whose gas breakdown sums above zero and explain why.

#### Scenario: An edited row is highlighted

- **WHEN** the admin changes a target value
- **THEN** the row is tinted and the changed cell is marked

#### Scenario: A unit error is warned about

- **WHEN** the admin changes a 1720 value to 1,72
- **THEN** the row shows a ÷1000 warning, the footer counts one warning, and the copy button stays enabled

#### Scenario: A new source in every row of a subcategory

- **WHEN** the admin changes the target source of every «Combustiones estacionarias» row to «DEFRA 2027»
- **THEN** each changed source cell is marked and the copy button stays enabled

#### Scenario: A factor with a gas breakdown

- **WHEN** a source factor has a gas breakdown summing above zero
- **THEN** its target value cannot be edited and a tooltip says to change it in the maintainer after copying

### Requirement: The copy page blocks only what the server would refuse

The copy button SHALL be disabled while the planner reports violations or nothing would be copied, and each violation SHALL be shown on its row, with the factors that would end duplicated also counted above the grid. After a successful copy, the page SHALL return to the maintainer grid with a Spanish summary of the result. A 409 or 422 answer SHALL be explained in Spanish and SHALL keep the admin's edits on the page.

#### Scenario: A clean copy

- **WHEN** no violation is reported and the admin presses «Copiar 249 factores a 2027»
- **THEN** the copy is posted, the grid shows the new 2027 factors, and a snackbar states the copied, edited and skipped counts

#### Scenario: A conflict keeps the edits

- **WHEN** the copy answers 409 `EMISSION_FACTOR_YEAR_COPY_CONFLICT`
- **THEN** the page asks to retry and keeps every edit

#### Scenario: Leaving with edits

- **WHEN** the admin navigates away, reloads or closes the tab with unsent edits
- **THEN** the page asks for confirmation before discarding them

#### Scenario: Changing the source year with edits

- **WHEN** the admin has edits and selects another «Origen»
- **THEN** the page asks for confirmation, and on confirming it discards the edits and lists the new source year

#### Scenario: Changing the target year with edits

- **WHEN** the admin has edits and selects another «Destino»
- **THEN** the edits stay, and the rows that already exist in the new target year become read-only

#### Scenario: Nothing to copy

- **WHEN** every source factor already exists in the target year
- **THEN** the copy button is disabled

### Requirement: The copy is documented for administrators and implementers

The emission factor maintainer help text SHALL describe the copy: its two uses (in the published version, available at once to the footprints of the target year, or in a duplicated version published afterwards), what it copies and skips, what blocks and what only warns, and that the source year does not change. The country implementation guide SHALL describe the yearly load through the copy, and the methodology maintainer chapter of the user manual SHALL show the copy page.

#### Scenario: Help text after seeding

- **WHEN** the database is seeded and an admin opens the emission factor maintainer help
- **THEN** it contains the «Copiar factores de un año» section with those points

#### Scenario: Implementation guide

- **WHEN** an implementer reads «Loading factors after launch» in the country implementation guide
- **THEN** it describes copying a year and correcting what changed, not loading one row at a time
