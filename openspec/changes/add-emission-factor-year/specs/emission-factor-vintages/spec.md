## ADDED Requirements

### Requirement: An emission factor declares its reporting year explicitly

An `EmissionFactor` SHALL carry a nullable `year` attribute containing the reporting year the factor applies to, not merely its source publication year. `year = null` SHALL mean the factor is confirmed as transversal and applies to every reporting year.

Seed and controlled import data SHALL keep provider/factor name in `source` and SHALL provide `year` explicitly as an integer or `null`; omission SHALL NOT be interpreted as transversal.

The maintainer SHALL advise users not to include the reporting year in the factor/source name because presentation appends the separate year automatically. When the name appears to contain a four-digit year, the maintainer SHALL show a non-blocking warning. The warning SHALL NOT prevent saving solely because the text contains a year.

#### Scenario: A dated factor is created

- **WHEN** a maintainer creates a factor with `source = "DEFRA"` and `year = 2025`
- **THEN** the factor SHALL be persisted and returned with `source = "DEFRA"` and `year = 2025`

#### Scenario: A confirmed transversal factor is created

- **WHEN** a maintainer creates a factor with an explicit `year = null`
- **THEN** the factor SHALL be persisted as transversal and SHALL be eligible for every reporting year

#### Scenario: A likely duplicated year produces guidance

- **GIVEN** the maintainer year field is `2025`
- **WHEN** the user enters `DEFRA 2025` as the factor/source name
- **THEN** the maintainer SHALL advise using `DEFRA` because the displayed factor will append `(2025)` automatically
- **AND** the warning SHALL NOT block saving

#### Scenario: Migration separates a recognized source suffix

- **GIVEN** the reviewed migration mapping classifies a factor stored as `source = "DEFRA 2025"` as reporting year 2025
- **WHEN** the migration runs
- **THEN** the factor SHALL become `source = "DEFRA"` and `year = 2025`

#### Scenario: Migration does not guess transversality

- **GIVEN** an existing factor has no year suffix and no reviewed dated/transversal classification
- **WHEN** the migration preflight runs
- **THEN** production migration SHALL stop and report the unclassified factor instead of assigning `year = null`

### Requirement: Factor identity uses source, year and dimensional unit family

At most one ACTIVE emission factor SHALL exist for this business key:

`(subcategory, normalized required dimension values, year, source, numerator magnitude, denominator magnitude)`.

The exact measurement units SHALL NOT form the identity. The numerator/denominator magnitude pair SHALL define a unit family. Dimension slots that are not required by the subcategory SHALL be normalized to `null` when applying this rule, and SHALL NOT be normalized on persistence: a value entered in a non-required slot SHALL be stored and returned unchanged.

The application and a partial database unique index SHALL enforce the same key. The index SHALL treat null values as equal and SHALL apply to non-deleted rows. `EmissionFactor` SHALL persist `numeratorMagnitudeId` and `denominatorMagnitudeId`, derived by the server from the selected rate unit. These IDs SHALL NOT be accepted as client-authored data. No textual family key or additional unit-family table is required.

#### Scenario: A second year is accepted

- **GIVEN** an ACTIVE `DEFRA` mass/energy factor exists for an activity with `year = 2025`
- **WHEN** a maintainer creates the otherwise equivalent factor with `year = 2026`
- **THEN** creation SHALL succeed

#### Scenario: Compatible exact units are one canonical factor

- **GIVEN** an ACTIVE factor exists for an activity, source and year in `kg/kg`
- **WHEN** a maintainer creates another factor for the same activity, source and year in `kg/ton`
- **THEN** creation SHALL be rejected as a duplicate because both rate units are mass/mass
- **AND** the `kg/ton` representation SHALL be obtained by converting the canonical factor

#### Scenario: Non-convertible unit families coexist

- **GIVEN** an ACTIVE mass/mass factor exists for an activity, source and year in `kg/ton`
- **WHEN** a maintainer creates factors with the same activity, source and year in `kg/kWh` and `kg/m3`
- **THEN** both creations SHALL succeed because mass/energy, mass/volume and mass/mass are different families

#### Scenario: Same-family scientific bases require a dimension

- **GIVEN** wet mass and dry mass need different factor values within the mass/mass family
- **WHEN** those factors are modeled in the catalog
- **THEN** the wet/dry basis SHALL be represented by a factor dimension
- **AND** exact unit spelling SHALL NOT be used to bypass the family uniqueness rule

#### Scenario: An optional dimension value is preserved and does not create a new identity

- **GIVEN** a subcategory whose position-1 dimension is not required
- **WHEN** a maintainer saves a factor with a value in that slot
- **THEN** the factor SHALL be persisted and returned with that dimension value
- **AND** it SHALL NOT count as a different identity from an otherwise equal factor whose slot is empty

#### Scenario: A duplicate including nulls is rejected

- **GIVEN** an ACTIVE factor exists with no required dimension values and `year = null`
- **WHEN** another factor is created with the same subcategory, source and unit family and `year = null`
- **THEN** creation SHALL be rejected as a duplicate

### Requirement: Multiple providers may coexist in the same vintage rank

The catalog SHALL allow more than one source for the same activity, reporting year and unit family, including more than one transversal source. The former subcategory-wide source-consistency validation SHALL NOT be applied.

#### Scenario: Two providers coexist for the same year

- **GIVEN** a `DEFRA (2025)` factor exists for an activity and unit family
- **WHEN** a maintainer creates an `IPCC (2025)` factor for the same activity and family
- **THEN** creation SHALL succeed

#### Scenario: Two transversal providers coexist

- **GIVEN** an `IPCC` factor with `year = null` exists for an activity and unit family
- **WHEN** a maintainer creates a `Kool, A.` factor with `year = null` for the same activity and family
- **THEN** creation SHALL succeed

#### Scenario: The same provider cannot duplicate a transversal factor

- **GIVEN** an `IPCC` factor with `year = null` exists for an activity and unit family
- **WHEN** another `IPCC` factor with `year = null` is created for the same business key
- **THEN** creation SHALL be rejected as a duplicate

### Requirement: Year and provider travel with every published factor

Every representation that exposes an emission factor's source SHALL also expose its year: maintainer responses, methodology payloads, compatible unit-converted representations, methodology exports and spreadsheet downloads. Duplicating a methodology version SHALL preserve source, year and canonical unit family.

#### Scenario: The capture payload carries vintage metadata

- **WHEN** the emission capture screen requests the inventory methodology
- **THEN** every canonical factor SHALL include source and year
- **AND** every compatible converted representation SHALL retain the base factor ID, source and year from which it was derived

#### Scenario: The spreadsheet keeps year separate from source

- **WHEN** a maintainer downloads the methodology spreadsheet
- **THEN** the factor sheet SHALL include a separate year column
- **AND** a transversal factor SHALL render with an empty year cell and its provider unchanged

#### Scenario: Duplicating a methodology preserves alternatives

- **GIVEN** a methodology has multiple dated and transversal providers for an activity
- **WHEN** the methodology version is duplicated
- **THEN** the duplicate SHALL preserve all alternatives with their source, year, unit family and value
