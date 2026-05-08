## ADDED Requirements

### Requirement: Category chart endpoint returns emissions per category grouped by methodology

The system SHALL expose a `GET /api/admin/dashboard/category-chart` endpoint. The endpoint SHALL only return methodologies that have at least one ACTIVE self-declared carbon inventory (`status: ACTIVE`, `isSelfDeclared: true`) matching the query filters. When no `year` filter is provided, the endpoint returns methodologies referenced by any ACTIVE self-declared inventory across all years. When a `year` filter is provided, it returns only methodologies referenced by ACTIVE self-declared inventories where `CarbonInventory.year` matches the selected year. If no matching inventories exist (with or without year filter), the response SHALL be an empty `methodologies` array. Methodologies are sorted descending by `MethodologyVersion.createdAt` (newest first). Categories with no matching emissions SHALL have `totalEmissions: 0`. This allows the frontend to render a methodology selector when multiple methodologies exist, defaulting to the first (most recent) methodology.

#### Scenario: Single methodology — all categories returned

- **WHEN** the endpoint is called and all matching inventories share the same methodology
- **THEN** the response SHALL include `methodologies` as an array with a single object containing `methodologyVersionId` (number), `methodologyVersionName` (string), and `categoryEmissions` as an array of objects for ALL categories defined in that methodology, each with `categoryName` (string) and `totalEmissions` (raw number in ton CO2eq, summed from `CarbonInventorySubtotalsView` for self-declared inventories only), including categories with zero emissions, sorted ascending by `Category.position`

#### Scenario: Single methodology with year filter

- **WHEN** the endpoint is called with `year=2025` and all matching inventories share the same methodology
- **THEN** the response SHALL include `methodologies` with one entry, its `categoryEmissions` filtered to inventories where `CarbonInventory.year = 2025`, listing all categories of that methodology

#### Scenario: No year filter — all inventories aggregated

- **WHEN** the endpoint is called without a `year` parameter
- **THEN** the response SHALL return only methodologies referenced by at least one ACTIVE self-declared inventory, aggregating emissions across all years, grouping by methodology and category as usual

#### Scenario: Multiple methodologies found

- **WHEN** the endpoint is called and the matching inventories belong to more than one methodology
- **THEN** the response SHALL include `methodologies` as an array with one entry per methodology, sorted descending by `MethodologyVersion.createdAt`, each containing `methodologyVersionId`, `methodologyVersionName`, and `categoryEmissions` with the emissions for that methodology's categories only

#### Scenario: No inventories found — empty response

- **WHEN** the endpoint is called (with or without a `year` parameter) and no ACTIVE self-declared inventories match the filters
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
