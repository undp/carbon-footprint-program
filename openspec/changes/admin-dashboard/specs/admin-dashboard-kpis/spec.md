## ADDED Requirements

### Requirement: Dashboard KPIs endpoint returns aggregated platform metrics

The system SHALL expose a GET endpoint at `/api/admin/dashboard/kpis` that returns aggregated platform-wide metrics. The endpoint MUST require authentication and SUPERADMIN or ADMIN role. All metrics SHALL be filterable by year via an optional `year` query parameter.

#### Scenario: Fetch KPIs without year filter

- **WHEN** an authenticated admin calls `GET /api/admin/dashboard/kpis`
- **THEN** the system returns a 200 response with all-time aggregated KPIs

#### Scenario: Fetch KPIs filtered by year

- **WHEN** an authenticated admin calls `GET /api/admin/dashboard/kpis?year=2026`
- **THEN** the system returns KPIs with year-scoped secondary values (e.g., organizations measuring in that year, verified emissions for that year, recognitions in application for that year)

#### Scenario: Unauthorized access

- **WHEN** a non-admin user calls `GET /api/admin/dashboard/kpis`
- **THEN** the system returns 403 Forbidden

### Requirement: Dashboard KPIs include organizations dual metric

The endpoint SHALL return an `organizations` object with `total` (all registered organizations) and `measuringInYear` (organizations with at least one carbon inventory in the selected year). When no year filter is provided, `measuringInYear` SHALL count organizations with inventories in the current year.

#### Scenario: Organizations dual metric

- **WHEN** there are 156 total organizations and 114 have inventories for 2026
- **THEN** the response `organizations` contains `{ total: 156, measuringInYear: 114 }`

### Requirement: Dashboard KPIs include emissions dual metric

The endpoint SHALL return an `emissions` object with `total` (sum of all tCO2e across all inventories) and `verified` (sum of tCO2e from inventories with APPROVED submission status). When year filter is provided, both values SHALL be scoped to that year.

#### Scenario: Emissions dual metric

- **WHEN** total emissions are 45,280 tCO2e and verified emissions are 40,120 tCO2e
- **THEN** the response `emissions` contains `{ total: 45280, verified: 40120 }`

### Requirement: Dashboard KPIs include recognitions dual metric

The endpoint SHALL return a `recognitions` object with `awarded` (total badges/recognitions delivered) and `inApplication` (submissions with PENDING status for recognition). When year filter is provided, both values SHALL be scoped to that year.

#### Scenario: Recognitions dual metric

- **WHEN** 86 recognitions have been awarded and 55 are in application
- **THEN** the response `recognitions` contains `{ awarded: 86, inApplication: 55 }`

### Requirement: Dashboard KPIs include organizations by sector breakdown

The endpoint SHALL return an `organizationsBySector` array with entries containing `sectorName` and `count` (number of organizations) and `emissions` (total tCO2e), sorted by count descending.

#### Scenario: Organizations grouped by sector

- **WHEN** there are organizations across multiple sectors
- **THEN** the response `organizationsBySector` contains one entry per sector with the organization count and aggregated emissions for that sector

### Requirement: Dashboard KPIs include emissions by scope breakdown

The endpoint SHALL return an `emissionsByScope` object with `scope1Percentage`, `scope2Percentage`, and `scope3Percentage` representing the distribution of emissions across the three scopes.

#### Scenario: Emission scope percentages

- **WHEN** the platform has emissions distributed across scopes
- **THEN** the response `emissionsByScope` percentages sum to approximately 100%

### Requirement: Dashboard KPIs include submission summary breakdown

The endpoint SHALL return a `submissionSummary` object with counts of submissions by status: `inReview` (PENDING), `approved` (APPROVED), and `objected` (OBJECTED).

#### Scenario: Submission summary with mixed statuses

- **WHEN** the platform has 12 PENDING, 38 APPROVED, and 5 OBJECTED submissions
- **THEN** the response `submissionSummary` contains `{ inReview: 12, approved: 38, objected: 5 }`
