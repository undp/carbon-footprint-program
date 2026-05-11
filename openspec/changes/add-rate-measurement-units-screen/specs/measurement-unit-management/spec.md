## MODIFIED Requirements

### Requirement: Rate measurement units list endpoint exposes reference counts

The endpoint `GET /api/measurement-units/rates` SHALL filter `where: { status: ACTIVE }` (unchanged) and SHALL accept no new querystring parameters.

Each response item SHALL include a `referenceCounts` object and a derived `totalReferenceCount`:

```ts
{
  emissionFactors: number; // EmissionFactor.rateMeasurementUnitId
  lineInputsAsManualFactor: number; // CarbonInventoryLineInput.manualFactorRateUnitId
  lineFactorsAsApplied: number; // CarbonInventoryLineFactor.appliedFactorRateUnitId
}
```

`totalReferenceCount` SHALL equal the sum of the three category counts. The implementation SHALL compute the counts via three parallel `groupBy` queries (one per referencing column), regardless of the number of rate units in the result. The number of database queries per request SHALL be fixed at four (one main `findMany` + three `groupBy`).

This requirement modifies the prior list-rates requirement to add the per-row counts. No filtering, search, or pagination querystring fields are added — the endpoint returns the full ACTIVE list.

#### Scenario: Returns all ACTIVE rate units with counts

- **WHEN** the endpoint is called
- **THEN** the response SHALL include every `RateMeasurementUnit` with `status = ACTIVE`, each carrying `referenceCounts` and `totalReferenceCount`

#### Scenario: Reference counts are accurate per category

- **WHEN** the endpoint returns a row for rate unit `R` and the database contains `e` `EmissionFactor` rows with `rateMeasurementUnitId = R.id`, `m` `CarbonInventoryLineInput` rows with `manualFactorRateUnitId = R.id`, and `a` `CarbonInventoryLineFactor` rows with `appliedFactorRateUnitId = R.id`
- **THEN** the response item SHALL have `referenceCounts.emissionFactors = e`, `referenceCounts.lineInputsAsManualFactor = m`, `referenceCounts.lineFactorsAsApplied = a`, and `totalReferenceCount = e + m + a`

#### Scenario: Endpoint remains publicly readable

- **WHEN** an authenticated user with any system role (including `USER`) calls the endpoint
- **THEN** the system SHALL respond with HTTP 200 — the endpoint is consumed by the carbon-inventory `EmissionEditor` flow for non-admin users
