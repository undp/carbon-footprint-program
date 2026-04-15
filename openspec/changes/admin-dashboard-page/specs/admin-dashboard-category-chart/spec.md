## ADDED Requirements

### Requirement: Category chart endpoint returns emissions per category grouped by methodology

The system SHALL expose a `GET /api/admin/dashboard/category-chart` endpoint. The endpoint SHALL determine which methodologies to return based on the ACTIVE self-declared inventories that match the query filters. When no `year` filter is provided, ALL active methodology versions (status `ACTIVE`) SHALL be returned with their categories. When a `year` filter is provided, only methodologies referenced by matching inventories for that year SHALL be returned — if no inventories match the year, the response SHALL be an empty `methodologies` array. Methodologies are sorted descending by `MethodologyVersion.createdAt` (newest first). Categories with no matching emissions SHALL have `totalEmissions: 0`. This allows the frontend to render a methodology selector when multiple methodologies exist, defaulting to the first (most recent) methodology.

#### Scenario: Single methodology — all categories returned

- **WHEN** the endpoint is called and all matching inventories share the same methodology
- **THEN** the response SHALL include `methodologies` as an array with a single object containing `methodologyId` (number), `methodologyName` (string), and `categoryEmissions` as an array of objects for ALL categories defined in that methodology, each with `categoryName` (string) and `totalEmissions` (number in tCO2e, summed from `CarbonInventorySubtotalsView` for self-declared inventories only), including categories with zero emissions, sorted ascending by the category's `position` attribute

#### Scenario: Single methodology with year filter

- **WHEN** the endpoint is called with `year=2025` and all matching inventories share the same methodology
- **THEN** the response SHALL include `methodologies` with one entry, its `categoryEmissions` filtered to inventories where `CarbonInventory.year = 2025`, listing all categories of that methodology

#### Scenario: No year filter — all inventories aggregated

- **WHEN** the endpoint is called without a `year` parameter
- **THEN** the response SHALL aggregate emissions from ALL ACTIVE self-declared inventories across all years, grouping by methodology and category as usual

#### Scenario: Multiple methodologies found

- **WHEN** the endpoint is called and the matching inventories belong to more than one methodology
- **THEN** the response SHALL include `methodologies` as an array with one entry per methodology, sorted descending by `MethodologyVersion.createdAt`, each containing `methodologyId`, `methodologyName`, and `categoryEmissions` with the emissions for that methodology's categories only

#### Scenario: No year filter and no inventories found — all methodologies returned

- **WHEN** the endpoint is called without a `year` parameter and no ACTIVE self-declared inventories exist
- **THEN** the response SHALL include ALL active methodology versions with their categories, each category having `totalEmissions: 0`

#### Scenario: Year filter and no inventories found — empty response

- **WHEN** the endpoint is called with a `year` parameter and no ACTIVE self-declared inventories match that year
- **THEN** the response SHALL include an empty `methodologies` array

#### Scenario: No active methodology versions exist

- **WHEN** the endpoint is called and no methodology versions with status `ACTIVE` exist
- **THEN** the response SHALL include an empty `methodologies` array

### Requirement: Category chart queries only consider ACTIVE carbon inventories

All Prisma queries involving carbon inventories SHALL filter by `status: ACTIVE` and `isSelfDeclared: true`, excluding any inventory with status `DELETED` or that is not self-declared.

#### Scenario: Deleted inventories are excluded

- **WHEN** the endpoint processes any query involving `CarbonInventory`
- **THEN** the query SHALL include a `where` condition with `status: "ACTIVE"` and `isSelfDeclared: true`, so deleted and non-self-declared inventories are never counted in the emissions distribution

### Requirement: Category chart endpoint validates year parameter

The optional `year` query parameter SHALL be validated using a Zod schema: coerced to number, positive integer, and no greater than the current year. Invalid values SHALL result in an HTTP 400 response.

#### Scenario: Invalid year

- **WHEN** the endpoint is called with a non-numeric, negative, or future `year`
- **THEN** the system SHALL respond with HTTP 400

### Requirement: Category chart route defines response schemas for all HTTP status codes

The `route.ts` file SHALL define Zod response schemas for every possible HTTP status code: 200 (success), 400 (invalid parameters), 401 (unauthenticated), 403 (forbidden), and 500 (internal server error). Successful responses SHALL return HTTP 200.

#### Scenario: Successful response

- **WHEN** the endpoint processes a valid request successfully
- **THEN** the system SHALL respond with HTTP 200 and the response body containing the `methodologies` array

### Requirement: Category chart endpoint requires admin authentication

The endpoint SHALL only be accessible to authenticated users with an admin role.

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Non-admin user request

- **WHEN** a request is made by an authenticated user without admin role
- **THEN** the system SHALL respond with HTTP 403
