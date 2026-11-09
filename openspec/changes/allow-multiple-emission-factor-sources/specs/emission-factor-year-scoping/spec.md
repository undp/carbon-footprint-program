## MODIFIED Requirements

### Requirement: Uniqueness accounts for the year across all enforcement layers

Emission-factor uniqueness SHALL admit one active factor per `(subcategory, required dimension values, year, source)`. `checkDuplicateEmissionFactor` SHALL include the year and the source in its key, and remains the authoritative check because the database index covers only the factors with both dimension values. An update that changes the subcategory, a dimension value, the year or the source SHALL run the check against the resulting key.

Two sources SHALL be the same source for the check when they are equal after trimming, collapsing each whitespace run to one space and ignoring letter case.

A subcategory SHALL accept active factors of several sources in the same year. There SHALL be no source-conflict error, and the maintainer SHALL NOT lock, replace or announce a factor's source based on the other factors of its subcategory and year.

Creating and updating a factor SHALL trim its `source` and collapse each run of whitespace inside it to one space before validating and storing it. A source that is empty after trimming SHALL be rejected with 400. Letter case SHALL be stored as entered.

The partial unique index on `emission_factor` SHALL include the year as a plain column.

#### Scenario: Two factors for the same key in different years coexist

- **GIVEN** an ACTIVE factor for a subcategory, its required dimension values and `source = "DEFRA 2025"` with `year = 2025`
- **WHEN** an administrator creates a factor for the same subcategory, dimension values and source with `year = 2026`
- **THEN** the creation SHALL succeed, and both factors SHALL remain ACTIVE

#### Scenario: Two factors for the same key and source in the same year are rejected

- **GIVEN** an ACTIVE factor for a subcategory and its required dimension values with `source = "DEFRA 2026"` and `year = 2026`
- **WHEN** an administrator creates a second factor for the same subcategory and dimension values with `source = "DEFRA 2026"` and `year = 2026`
- **THEN** the request SHALL be rejected as a duplicate (409 `EMISSION_FACTOR_DUPLICATE`)

#### Scenario: Same activity with another source in the same year is accepted

- **GIVEN** an ACTIVE factor for a subcategory and its required dimension values with `source = "DEFRA 2026"` and `year = 2026`
- **WHEN** an administrator creates a factor for the same subcategory, dimension values and year with `source = "Factor nacional"`
- **THEN** the creation SHALL succeed, and both factors SHALL remain ACTIVE

#### Scenario: Different activities with different sources in the same year are accepted

- **GIVEN** an ACTIVE factor of a subcategory for one dimension value with `source = "DEFRA 2026"` and `year = 2026`
- **WHEN** an administrator creates a factor of that subcategory for another dimension value with `source = "IPCC 2006"` and `year = 2026`
- **THEN** the creation SHALL succeed

#### Scenario: A source differing only in letter case is the same source

- **GIVEN** an ACTIVE factor for a key with `source = "DEFRA 2025"` and `year = 2026`
- **WHEN** an administrator creates the same key with `source = "defra 2025"` and `year = 2026`
- **THEN** the request SHALL be rejected as a duplicate

#### Scenario: Renaming the source onto an existing key is a duplicate

- **GIVEN** two ACTIVE factors of the same subcategory, dimension values and year, with sources `"DEFRA 2025"` and `"Factor nacional"`, and no line using the second
- **WHEN** an administrator changes only the source of the second factor to `"DEFRA 2025"`
- **THEN** the request SHALL be rejected as a duplicate

#### Scenario: Changing a factor's source to one its subcategory does not use is accepted

- **GIVEN** two ACTIVE factors of a subcategory in the same year for different dimension values, both with `source = "DEFRA 2025"`, and no line using the second
- **WHEN** an administrator changes only the source of the second factor to `"IPCC 2006"`
- **THEN** the update SHALL succeed, and the subcategory SHALL hold both sources in that year

#### Scenario: Moving a factor's year re-checks the target year

- **GIVEN** ACTIVE factors for the same key and source dated 2025 and 2026, and no line using the 2025 one
- **WHEN** an administrator changes the 2025 factor's year to 2026
- **THEN** the request SHALL be rejected as a duplicate

#### Scenario: Moving a factor's year next to another source is accepted

- **GIVEN** an ACTIVE factor for a key with `source = "DEFRA 2025"` and `year = 2025`, no line using it, and an ACTIVE factor for the same key with `source = "DEFRA 2026"` and `year = 2026`
- **WHEN** an administrator changes the 2025 factor's year to 2026
- **THEN** the update SHALL succeed, and the key SHALL hold both sources in 2026

#### Scenario: The source is normalized

- **WHEN** an administrator creates a factor with `source = "  DEFRA   2025 "`
- **THEN** the factor SHALL be stored with `source = "DEFRA 2025"`, and a later create of the same key with `source = "DEFRA 2025"` SHALL be rejected as a duplicate

#### Scenario: A blank source is rejected

- **WHEN** an administrator creates or updates a factor with `source = "   "`
- **THEN** the request SHALL be rejected with 400, and nothing SHALL be written

#### Scenario: The maintainer leaves the source free

- **GIVEN** a subcategory with persisted factors of `source = "DEFRA 2025"` in 2026
- **WHEN** an administrator adds a row for that subcategory and year, or moves a row into it, and types `"Factor nacional"` as its source
- **THEN** the cell SHALL keep `"Factor nacional"`, show no lock and announce no replacement
