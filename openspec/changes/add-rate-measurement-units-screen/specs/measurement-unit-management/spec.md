## MODIFIED Requirements

### Requirement: Rate measurement units list endpoint supports filtering, search, and reference counts

The endpoint `GET /api/measurement-units/rates` SHALL filter `where: { status: ACTIVE }` (unchanged) and SHALL accept three optional querystring fields:

- `numeratorMagnitudeId` (`IdSchema`) — when present, filters to rate units whose numerator MU's `magnitudeId` matches.
- `denominatorMagnitudeId` (`IdSchema`) — when present, filters to rate units whose denominator MU's `magnitudeId` matches.
- `search` (string, 1–100 chars, trimmed) — when present, filters to rate units whose `abbreviation` matches `{ contains: search, mode: "insensitive" }`.

Each response item SHALL include a `referenceCounts` object and a derived `totalReferenceCount`:

```ts
{
  emissionFactors: number; // EmissionFactor.rateMeasurementUnitId
  lineInputsAsManualFactor: number; // CarbonInventoryLineInput.manualFactorRateUnitId
  lineFactorsAsApplied: number; // CarbonInventoryLineFactor.appliedFactorRateUnitId
}
```

`totalReferenceCount` SHALL equal the sum of the three category counts. The implementation SHALL compute the counts via three parallel `groupBy` queries (one per referencing column), regardless of the number of rate units in the result. The number of database queries per request SHALL be fixed at four (one main `findMany` + three `groupBy`).

This requirement modifies the prior list-rates requirement to add the three filter fields and the per-row counts.

#### Scenario: No filters returns all ACTIVE rate units

- **WHEN** the endpoint is called with no querystring parameters
- **THEN** the response SHALL include every `RateMeasurementUnit` with `status = ACTIVE`, each carrying `referenceCounts` and `totalReferenceCount`

#### Scenario: Numerator magnitude filter

- **WHEN** the endpoint is called with `numeratorMagnitudeId = M`
- **THEN** the response SHALL only include rate units where the numerator MU's `magnitudeId` equals `M`

#### Scenario: Denominator magnitude filter

- **WHEN** the endpoint is called with `denominatorMagnitudeId = M`
- **THEN** the response SHALL only include rate units where the denominator MU's `magnitudeId` equals `M`

#### Scenario: Search is case-insensitive substring on abbreviation

- **WHEN** the endpoint is called with `search = "kg"`
- **THEN** the response SHALL include `kg/km`, `kg/L`, etc. AND SHALL NOT include `ton/km`. A search of `"KG"` (uppercase) SHALL produce the same result.

#### Scenario: Search is bounded by the schema

- **WHEN** the endpoint is called with `search = ""` (empty after trimming) or `search.length > 100`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Combined filters

- **WHEN** the endpoint is called with `numeratorMagnitudeId = M1`, `denominatorMagnitudeId = M2`, and `search = "k"` simultaneously
- **THEN** the response SHALL include only rate units satisfying all three filters

#### Scenario: Reference counts are accurate per category

- **WHEN** the endpoint returns a row for rate unit `R` and the database contains `e` `EmissionFactor` rows with `rateMeasurementUnitId = R.id`, `m` `CarbonInventoryLineInput` rows with `manualFactorRateUnitId = R.id`, and `a` `CarbonInventoryLineFactor` rows with `appliedFactorRateUnitId = R.id`
- **THEN** the response item SHALL have `referenceCounts.emissionFactors = e`, `referenceCounts.lineInputsAsManualFactor = m`, `referenceCounts.lineFactorsAsApplied = a`, and `totalReferenceCount = e + m + a`

#### Scenario: Endpoint remains publicly readable

- **WHEN** an authenticated user with any system role (including `USER`) calls the endpoint
- **THEN** the system SHALL respond with HTTP 200 — the endpoint is consumed by the carbon-inventory `EmissionEditor` flow for non-admin users
