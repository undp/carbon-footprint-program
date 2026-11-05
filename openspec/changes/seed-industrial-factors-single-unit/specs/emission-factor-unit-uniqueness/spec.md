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

### Requirement: Installed databases drop the duplicated industrial-process factors without losing line data

A data migration SHALL bring an installed database to the same factor catalogue as the seed. For each `ACTIVE` factor with rate unit `kg/kg` in a subcategory named one of the seven above that has a twin, it SHALL:

1. set `emission_factor_id` to the twin on every `carbon_inventory_line_factor` that references the `kg/kg` factor;
2. set the `kg/kg` factor's `status` to `DELETED`.

A twin is an `ACTIVE` factor with rate unit `kg/ton` in the same subcategory, with the same first and second dimension values (NULL matching NULL), source and year, whose value equals the `kg/kg` value × 1000.

The migration SHALL leave `applied_factor_value`, `applied_factor_rate_unit_id`, `applied_factor_source`, `derivation_details` and every `carbon_inventory_line_result` unchanged. It SHALL NOT touch a `kg/kg` factor without a twin, any factor outside the seven subcategories, or any `kg/ton` factor. It SHALL be idempotent, and SHALL succeed on a database where nothing matches.

#### Scenario: Seeded database before this change

- **WHEN** the migration runs on a database seeded with `base` from before this change
- **THEN** the 70 industrial-process `kg/kg` factors SHALL be `DELETED`, the 70 `kg/ton` factors SHALL stay `ACTIVE` and unchanged, and the active catalogue SHALL hold no conversion collision

#### Scenario: A line references a duplicated factor

- **WHEN** a `carbon_inventory_line_factor` references a `kg/kg` factor that has a twin
- **THEN** after the migration it SHALL reference the twin, with the same applied value, applied rate unit and line result as before, and a save of its subcategory SHALL NOT be refused as a reference to a deleted factor

#### Scenario: A kg/kg factor without an equivalent twin

- **WHEN** an `ACTIVE` `kg/kg` factor in one of the seven subcategories has no `kg/ton` factor with the same key whose value is its own × 1000
- **THEN** the migration SHALL leave it `ACTIVE` and leave its line references unchanged

#### Scenario: A colliding pair outside the seven subcategories

- **WHEN** another subcategory holds a `kg/kg` factor and its `kg/ton` twin
- **THEN** the migration SHALL leave both unchanged

#### Scenario: Running the migration twice

- **WHEN** the migration's statements run a second time on the migrated database
- **THEN** no row SHALL change
