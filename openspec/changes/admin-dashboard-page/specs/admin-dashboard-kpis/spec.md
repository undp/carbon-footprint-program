## ADDED Requirements

### Requirement: Dashboard KPIs endpoint returns organization counts

The system SHALL expose a `GET /api/admin/dashboard/kpis` endpoint that returns `totalOrganizations` (total number of organizations on the platform) and `measuringOrganizations` (number of organizations with at least one self-declared inventory).

#### Scenario: KPIs without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `totalOrganizations` (total count) and `measuringOrganizations` (organizations with self-declared inventories across all years)

#### Scenario: KPIs with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `totalOrganizations` (total count, unaffected by year) and `measuringOrganizations` filtered to organizations with self-declared inventories where `CarbonInventory.year = 2025`

### Requirement: Dashboard KPIs endpoint returns emissions totals

The system SHALL return `totalEmissions` (sum of emissions from self-declared inventories) and `verifiedEmissions` (sum of emissions from verified inventories, i.e. inventories with an approved verification submission) in the KPIs response.

#### Scenario: Emissions totals without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `totalEmissions` (from self-declared inventories) and `verifiedEmissions` (from verified inventories) as numeric values in tCO2e across all years

#### Scenario: Emissions totals with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `totalEmissions` and `verifiedEmissions` filtered to inventories where `CarbonInventory.year = 2025`

### Requirement: Dashboard KPIs endpoint returns recognition counts

The system SHALL return `recognitionsEarned` (number of approved submissions, counting both `APPROVED` and `APPROVED_AUTOMATICALLY`) and `recognitionsUnderReview` (number of submissions with status `PENDING`).

#### Scenario: Recognition counts without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `recognitionsEarned` and `recognitionsUnderReview` across all years

#### Scenario: Recognition counts with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `recognitionsEarned` and `recognitionsUnderReview` filtered to submissions associated with inventories where `CarbonInventory.year = 2025`

### Requirement: Dashboard KPIs endpoint requires admin authentication

The endpoint SHALL only be accessible to authenticated users with an admin role.

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Non-admin user request

- **WHEN** a request is made by an authenticated user without admin role
- **THEN** the system SHALL respond with HTTP 403
