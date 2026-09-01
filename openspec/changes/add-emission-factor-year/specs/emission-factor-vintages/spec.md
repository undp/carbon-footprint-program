## ADDED Requirements

### Requirement: An emission factor declares the reporting year it applies to

An `EmissionFactor` SHALL carry a nullable `year` attribute holding the **reporting year the factor applies to** — not the year its source was published. A `null` year SHALL mean the factor is _transversal_: it does not depend on the reporting year and serves any measurement year.

The year SHALL be stored as its own attribute. The `source` attribute SHALL hold the provider only (`"DEFRA"`), never the year concatenated into the text (`"DEFRA 2025"`). Presentation layers MAY render the two together.

#### Scenario: A dated factor is created

- **WHEN** a maintainer creates an emission factor for a subcategory with `source = "DEFRA"` and `year = 2025`
- **THEN** the factor SHALL be persisted with `year = 2025` and `source = "DEFRA"`, AND the year SHALL be returned by every endpoint that returns the factor

#### Scenario: A transversal factor is created

- **WHEN** a maintainer creates an emission factor without a year, for an activity whose value comes from process chemistry rather than a dated dataset
- **THEN** the factor SHALL be persisted with `year = null`, AND it SHALL be eligible for a footprint of any measurement year

#### Scenario: Existing factors are migrated

- **WHEN** the data migration runs against a catalog whose factors carry the year inside `source`
- **THEN** a factor with `source = "DEFRA 2025"` SHALL end up with `source = "DEFRA"` and `year = 2025`, AND a factor with `source = "IPCC"` SHALL end up with `source = "IPCC"` and `year = null`

### Requirement: Several vintages of the same activity coexist

At most one ACTIVE emission factor SHALL exist per (subcategory, the dimension values of the subcategory's required dimensions, year). Factors that differ only in their year SHALL NOT be treated as duplicates.

The uniqueness rule SHALL be enforced both by the application and by a partial unique index that treats null values as equal, so that factors with no dimension values and no year are covered by the constraint rather than escaping it.

#### Scenario: A second vintage is accepted

- **GIVEN** an ACTIVE factor exists for a subcategory with `year = 2025`
- **WHEN** a maintainer creates a factor for the same subcategory and the same required dimension values with `year = 2026`
- **THEN** the creation SHALL succeed

#### Scenario: A duplicate within the same year is rejected

- **GIVEN** an ACTIVE factor exists for a subcategory with `year = 2025`
- **WHEN** a maintainer creates another factor for the same subcategory, the same required dimension values and `year = 2025`
- **THEN** the creation SHALL be rejected as a duplicate

#### Scenario: A second transversal factor is rejected

- **GIVEN** an ACTIVE factor exists for a subcategory with `year = null`
- **WHEN** a maintainer creates another factor for the same subcategory and the same required dimension values with `year = null`
- **THEN** the creation SHALL be rejected as a duplicate, because a null year is compared as a value and not as an unknown

### Requirement: One source per subcategory and year

All ACTIVE emission factors of a subcategory that share the same year SHALL share the same `source`. Factors of the same subcategory with different years MAY have different sources.

#### Scenario: A new vintage may keep the same provider

- **GIVEN** a subcategory whose 2025 factors all have `source = "DEFRA"`
- **WHEN** a maintainer creates a factor for that subcategory with `year = 2026` and `source = "DEFRA"`
- **THEN** the creation SHALL succeed

#### Scenario: A new vintage may change provider

- **GIVEN** a subcategory whose 2025 factors all have `source = "DEFRA"`
- **WHEN** a maintainer creates a factor for that subcategory with `year = 2026` and `source = "IPCC"`
- **THEN** the creation SHALL succeed, because the source consistency rule is scoped to a single year

#### Scenario: Mixing sources within one year is rejected

- **GIVEN** a subcategory whose 2025 factors all have `source = "DEFRA"`
- **WHEN** a maintainer creates a factor for that subcategory with `year = 2025` and `source = "IPCC"`
- **THEN** the creation SHALL be rejected with the source-conflict error naming the existing source

### Requirement: The year travels with the factor wherever it is published

Every representation of an emission factor that already exposes its source SHALL also expose its year: the maintainer listing, the methodology payload consumed by the emission capture screen (including the unit-converted copies of a factor), the methodology export, and the methodology spreadsheet download, where the year SHALL be a column of its own next to the source.

Duplicating a methodology version SHALL preserve each factor's year.

#### Scenario: The capture payload carries the year

- **WHEN** the emission capture screen requests the methodology of a carbon inventory
- **THEN** every emission factor in the response SHALL include its year, AND each unit-converted copy of a factor SHALL carry the same year as the factor it was derived from

#### Scenario: The spreadsheet download carries the year

- **WHEN** a maintainer downloads the methodology as a spreadsheet
- **THEN** the emission-factors sheet SHALL include a year column, AND a transversal factor SHALL render as an empty year cell rather than as a fabricated year

#### Scenario: Duplicating a methodology preserves vintages

- **WHEN** a maintainer duplicates a methodology version whose catalog holds factors for 2025 and 2026
- **THEN** the duplicated catalog SHALL hold the same factors with the same years
