## ADDED Requirements

### Requirement: Category chart endpoint returns emissions distribution by category

The system SHALL expose a `GET /api/admin/dashboard/category-chart` endpoint that returns the emissions distribution grouped by emission category (Scope 1, Scope 2, Scope 3 or equivalent category names).

#### Scenario: Category emissions without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `categoryEmissions` as an array of objects, each with `categoryName` (string) and `totalEmissions` (number in tCO2e)

#### Scenario: Category emissions with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `categoryEmissions` filtered to inventories where `CarbonInventory.year = 2025`

### Requirement: Category chart endpoint requires admin authentication

The endpoint SHALL only be accessible to authenticated users with an admin role.

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Non-admin user request

- **WHEN** a request is made by an authenticated user without admin role
- **THEN** the system SHALL respond with HTTP 403
