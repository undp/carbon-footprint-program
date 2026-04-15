## ADDED Requirements

### Requirement: Sector chart endpoint returns top-N organizations and emissions per sector

The system SHALL expose a `GET /api/admin/dashboard/sector-chart` endpoint that accepts a required `limit` query parameter (positive integer) and an optional `year` query parameter. The response SHALL include both `sectorRanking` (accredited organizations per sector) and `sectorEmissions` (emissions per sector). Only organizations with an approved `ORGANIZATION_ACCREDITATION` submission (status `APPROVED` or `APPROVED_AUTOMATICALLY`) SHALL be counted in `sectorRanking`. The sector for each organization is resolved exclusively from `OrganizationData.sectorId` (associated with the Organization) — the `CarbonInventory.organizationData.sectorId` field SHALL NOT be used. If `OrganizationData.sectorId` is NULL, the organization and its emissions SHALL be grouped under a NULL sector. Sector names are resolved from the `Sector` table; the frontend SHALL label the NULL sector group as "Desconocido". Emissions are computed by summing from the `CarbonInventorySubtotalsView`, filtering only ACTIVE inventories where `isSelfDeclared = true`.

#### Scenario: Sector ranking with limit

- **WHEN** the endpoint is called with `limit=5`
- **THEN** the response SHALL include `sectorRanking` as an array of up to 5 objects, each with `sectorName` (string | null) and `organizationCount` (integer), sorted descending by `organizationCount`

#### Scenario: Sector emissions with limit

- **WHEN** the endpoint is called with `limit=5`
- **THEN** the response SHALL include `sectorEmissions` as an array of up to 5 objects, each with `sectorName` (string | null) and `totalEmissions` (number in tCO2e), sorted descending by `totalEmissions`

#### Scenario: Organizations with null sector

- **WHEN** some organizations have `OrganizationData.sectorId` as NULL
- **THEN** those organizations and their emissions SHALL be grouped under a single entry with `sectorName: null` in both `sectorRanking` and `sectorEmissions`. The frontend SHALL display this group as "Desconocido"

#### Scenario: Sector ranking with different limit

- **WHEN** the endpoint is called with `limit=10`
- **THEN** the response SHALL include both `sectorRanking` and `sectorEmissions` as arrays of up to 10 objects each

#### Scenario: Sector ranking with year filter

- **WHEN** the endpoint is called with `limit=5&year=2025`
- **THEN** the response SHALL include `sectorRanking` counting only accredited organizations whose accreditation was approved up to and including 2025 (cumulative, same logic as organization KPIs), and `sectorEmissions` filtered to self-declared inventories where `CarbonInventory.year = 2025`

#### Scenario: Fewer sectors than limit

- **WHEN** fewer sectors exist than the requested `limit`
- **THEN** the response SHALL return only the existing sectors (array length < limit) for both arrays

#### Scenario: Tie at the last position in sectorRanking

- **WHEN** multiple sectors share the same `organizationCount` at the cutoff position (e.g., `limit=5` and sectors ranked 5th, 6th, and 7th all have the same count)
- **THEN** the response SHALL include all tied entries, potentially returning more than `limit` items in `sectorRanking`

#### Scenario: Tie at the last position in sectorEmissions

- **WHEN** multiple sectors share the same `totalEmissions` at the cutoff position
- **THEN** the response SHALL include all tied entries, potentially returning more than `limit` items in `sectorEmissions`

#### Scenario: No data found

- **WHEN** no organizations with inventories exist for the given filters
- **THEN** the response SHALL return empty arrays: `{ sectorRanking: [], sectorEmissions: [] }`

### Requirement: Sector chart queries only consider ACTIVE carbon inventories

All Prisma queries involving carbon inventories SHALL filter by `status: ACTIVE`, excluding any inventory with status `DELETED`. Additionally, emissions queries (`sectorEmissions`) SHALL also filter by `isSelfDeclared: true` to align with the KPIs endpoint.

#### Scenario: Deleted inventories are excluded

- **WHEN** the endpoint processes any query involving `CarbonInventory`
- **THEN** the query SHALL include a `where` condition with `status: "ACTIVE"`, so deleted inventories are never counted in the sector ranking or emissions. For `sectorEmissions` queries, the filter SHALL also include `isSelfDeclared: true`

### Requirement: Sector chart endpoint validates query parameters

The `year` and `limit` query parameters SHALL be validated using Zod schemas. `year` is optional, coerced to number, positive integer, max current year. `limit` is required, coerced to number, positive integer. Invalid values SHALL result in an HTTP 400 response.

#### Scenario: Invalid year

- **WHEN** the endpoint is called with a non-numeric, negative, or future `year`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Invalid limit

- **WHEN** the endpoint is called with a non-numeric, negative, or zero `limit`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Missing limit

- **WHEN** the endpoint is called without a `limit` parameter
- **THEN** the system SHALL respond with HTTP 400

### Requirement: Sector chart route defines response schemas for all HTTP status codes

The `route.ts` file SHALL define Zod response schemas for every possible HTTP status code: 200 (success), 400 (invalid parameters), 401 (unauthenticated), 403 (forbidden), and 500 (internal server error). Successful responses SHALL return HTTP 200.

#### Scenario: Successful response

- **WHEN** the endpoint processes a valid request successfully
- **THEN** the system SHALL respond with HTTP 200 and the sector chart response body containing both `sectorRanking` and `sectorEmissions`

### Requirement: Sector chart endpoint requires admin authentication

The endpoint SHALL only be accessible to authenticated users with an admin role.

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Non-admin user request

- **WHEN** a request is made by an authenticated user without admin role
- **THEN** the system SHALL respond with HTTP 403
