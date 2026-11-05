## ADDED Requirements

### Requirement: Industrial-process factors are seeded once per year, in tonnes

Every emission factor of an industrial-process subcategory SHALL be seeded exactly once per dimension value, source and year, with rate unit `kg/ton`, in both the `base` and `testing` datasets. No industrial-process subcategory SHALL carry a seeded `kg/kg` or `kg/g` factor.

The seeded factors per year SHALL be the `kg/ton` factors present before this change, with the same dimension value, source and value:

| Subcategory                                             | `kg/ton` factors per year |
| ------------------------------------------------------- | ------------------------: |
| Procesos industriales - Cinc                            |                         3 |
| Procesos industriales - Cemento                         |                         1 |
| Procesos industriales - Vidrio                          |                         8 |
| Procesos industriales - Acero                           |                         4 |
| Procesos industriales - Cal                             |                         3 |
| Procesos industriales - Aluminio                        |                         2 |
| Procesos industriales - Ferroaleaciones y otros metales |                        14 |

`base` SHALL carry this set for 2025 and for 2026, and `testing` SHALL carry it for 2025.

#### Scenario: Seeded industrial-process factors after this change

- **WHEN** the factors of the seven subcategories are read from `base/methodologies.json`
- **THEN** there SHALL be 35 factors per year for 2025 and 2026, all with rate unit `kg/ton`, and their dimension value, source and value SHALL match the `kg/ton` factors before this change

#### Scenario: Catalogue size

- **WHEN** every factor in `base/methodologies.json` is counted
- **THEN** there SHALL be 498 factors, 249 per year, of which 51 per year have source `IPCC`

### Requirement: Capture resolves one factor for an industrial-process declaration in any mass unit

For a declaration in one of the seven subcategories above, with a dimension value that has a seeded factor, capture SHALL offer exactly one `IPCC` candidate whether the quantity is declared in `g`, `kg` or `ton`, and SHALL auto-fill it. The candidate SHALL be the seeded `kg/ton` factor or a factor `getCarbonInventoryMethodology` derives from it.

#### Scenario: Declaring clinker in any mass unit

- **WHEN** a user declares 1 tonne of "Clinker" under Procesos industriales - Cemento, for a 2025 or 2026 footprint, as `1 ton`, `1000 kg` or `1000000 g`, with source `IPCC`
- **THEN** capture SHALL fill the factor automatically (`520` kg/ton, `0.52` kg/kg or `0.00052` kg/g), report 0.52 tCO₂e in all three cases, and log no "multiple available factors" warning

#### Scenario: Unit menu in calculator mode is unchanged

- **WHEN** a user in calculator mode opens the unit menu of any of the seven subcategories
- **THEN** `g`, `kg` and `ton` SHALL all be offered, because they are derived from the `kg/ton` factor

### Requirement: The seed rejects factors that collide through unit conversion

A seed check SHALL fail when two factors of one subcategory share source, year, numerator magnitude and denominator magnitude, whatever their rate units, and match on both dimensions. Two factors match on a dimension when their values for it are equal or either one is NULL, because capture offers a factor with a NULL dimension for any value of that dimension. Such factors derive into each other's rate units and leave capture with two candidates. Factors that differ in source, in year or in magnitudes (for example `kg/L` and `kg/kWh` for the same fuel) SHALL NOT be reported.

The check SHALL run as a `tools/seed` unit test over the `base` and `testing` datasets, read from their JSON files, so the `seed-test` CI job runs it on every pull request without a database. On failure it SHALL name each colliding pair by subcategory, dimension values, source, year and the rate units involved.

#### Scenario: The shipped datasets have no collision

- **WHEN** the check runs over `base` and over `testing`
- **THEN** it SHALL report no collision

#### Scenario: A factor seeded twice in two mass units

- **WHEN** a dataset holds "Cal alta en calcio", `IPCC`, 2025 at `750 kg/ton` and at `0.75 kg/kg`
- **THEN** the check SHALL fail and name Procesos industriales - Cal, "Cal alta en calcio", `IPCC`, 2025, `kg/ton` and `kg/kg`

#### Scenario: Same fuel in two magnitudes

- **WHEN** a subcategory holds a fuel, one source and one year at `kg/L` and at `kg/kWh`
- **THEN** the check SHALL NOT report them

#### Scenario: A generic factor overlapping a specific one

- **WHEN** a subcategory holds "Clinker", `IPCC`, 2025 at `520 kg/ton`, and a factor with no first dimension value, `IPCC`, 2025 at `500 kg/ton`
- **THEN** the check SHALL fail and name both factors

#### Scenario: A generic factor under another source

- **WHEN** a subcategory holds "Clinker", `IPCC`, 2025 at `520 kg/ton`, and a factor with no first dimension value, another source, 2025 at `500 kg/ton`
- **THEN** the check SHALL NOT report them

#### Scenario: Same key in different years

- **WHEN** a dataset holds the same dimension value, source and rate unit for 2025 and for 2026
- **THEN** the check SHALL NOT report them
