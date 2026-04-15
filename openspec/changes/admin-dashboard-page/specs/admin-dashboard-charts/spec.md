## ADDED Requirements

### Requirement: Sector chart endpoint returns top-5 organizations per sector

The system SHALL expose a `GET /api/admin/dashboard/sector-chart` endpoint that returns the top 5 sectors ranked by the number of organizations that have inventories in each sector.

#### Scenario: Sector ranking without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `sectorRanking` as an array of up to 5 objects, each with `sectorName` (string) and `organizationCount` (integer), sorted descending by `organizationCount`

#### Scenario: Sector ranking with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `sectorRanking` filtered to inventories where `CarbonInventory.year = 2025`

#### Scenario: Fewer than 5 sectors exist

- **WHEN** fewer than 5 sectors have organizations with inventories
- **THEN** the response SHALL return only the existing sectors (array length < 5)

### Requirement: Sector chart endpoint requires admin authentication

The endpoint SHALL only be accessible to authenticated users with an admin role.

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Non-admin user request

- **WHEN** a request is made by an authenticated user without admin role
- **THEN** the system SHALL respond with HTTP 403
