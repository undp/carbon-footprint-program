## ADDED Requirements

### Requirement: Dashboard KPIs endpoint returns organization counts

The system SHALL expose a `GET /api/admin/dashboard/kpis` endpoint that returns `totalOrganizations` (number of organizations with an approved `ORGANIZATION_ACCREDITATION` submission, i.e. status `APPROVED` or `APPROVED_AUTOMATICALLY`) and `measuringOrganizations` (number of those accredited organizations that also have at least one ACTIVE inventory where `isSelfDeclared = true`). Note: "self-declared" (`isSelfDeclared = true`) refers to the origin of the inventory declaration and remains true even if the inventory is later verified — `measuringOrganizations` therefore includes organizations whose inventories have been verified.

#### Scenario: KPIs without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `totalOrganizations` (total count of accredited organizations) and `measuringOrganizations` (accredited organizations with at least one ACTIVE self-declared inventory where `CarbonInventory.year` is within the last 2 years including the current year — same filter as the `organization_carbon_inventories_summary` view)

#### Scenario: KPIs with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `totalOrganizations` (cumulative count of organizations whose `ORGANIZATION_ACCREDITATION` submission was approved up to and including end of 2025) and `measuringOrganizations` (accredited organizations with at least one ACTIVE self-declared inventory where `CarbonInventory.year = 2025`)

### Requirement: Dashboard KPIs endpoint returns emissions totals

The system SHALL return `totalEmissions` and `verifiedEmissions` in the KPIs response. Both values are computed by summing from the `CarbonInventorySubtotalsView`. `totalEmissions` sums emissions from ACTIVE inventories where `isSelfDeclared = true` — this includes inventories that were later verified, since the `isSelfDeclared` flag is about the origin of the declaration and is not affected by the verification process. `verifiedEmissions` is a **subset** of `totalEmissions`: it sums emissions only from those same self-declared ACTIVE inventories that also have an associated Submission with `type = CARBON_INVENTORY_VERIFICATION` and `status = APPROVED`. Therefore `verifiedEmissions <= totalEmissions` always holds.

#### Scenario: Emissions totals without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `totalEmissions` (from self-declared inventories) and `verifiedEmissions` (from verified inventories) as numeric values in tCO2e across all years

#### Scenario: Emissions totals with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL include `totalEmissions` and `verifiedEmissions` filtered to inventories where `CarbonInventory.year = 2025`

### Requirement: Dashboard KPIs endpoint returns recognition counts

The system SHALL return `recognitionsEarned` (number of approved submissions, counting both `APPROVED` and `APPROVED_AUTOMATICALLY`) and `recognitionsUnderReview` (number of submissions with status `PENDING`). Submissions are associated to carbon inventories via the join path: `Submission → SubmissionSubject → SubmissionSubjectCarbonInventory → CarbonInventory`. For submissions without a carbon inventory association (e.g., `ORGANIZATION_ACCREDITATION`, which links to `SubmissionSubjectOrganizationData` instead), the year is determined from `Submission.createdAt`.

#### Scenario: Recognition counts without year filter

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL include `recognitionsEarned` and `recognitionsUnderReview` across all submissions (all types, all years)

#### Scenario: Recognition counts with year filter — inventory-linked submissions

- **WHEN** the endpoint is called with `year=2025` and a submission has a carbon inventory association (via `SubmissionSubjectCarbonInventory`)
- **THEN** the submission SHALL be included only if `CarbonInventory.year = 2025`

#### Scenario: Recognition counts with year filter — submissions without inventory

- **WHEN** the endpoint is called with `year=2025` and a submission has no carbon inventory association (e.g., `ORGANIZATION_ACCREDITATION`)
- **THEN** the submission SHALL be included only if `EXTRACT(YEAR FROM Submission.createdAt) = 2025`

### Requirement: Dashboard KPIs endpoint returns zeros when no data exists

When no matching data is found for any KPI field, the endpoint SHALL return the normal response shape with all values set to 0.

#### Scenario: No data for filtered year

- **WHEN** the endpoint is called with a year that has no inventories, submissions, or accredited organizations
- **THEN** the response SHALL return all fields (`totalOrganizations`, `measuringOrganizations`, `totalEmissions`, `verifiedEmissions`, `recognitionsEarned`, `recognitionsUnderReview`) with value 0

### Requirement: Dashboard KPIs queries only consider ACTIVE carbon inventories

All Prisma queries involving carbon inventories SHALL filter by `status: ACTIVE`, excluding any inventory with status `DELETED`.

#### Scenario: Deleted inventories are excluded

- **WHEN** the endpoint processes any query involving `CarbonInventory`
- **THEN** the query SHALL include a `where` condition with `status: "ACTIVE"`, so deleted inventories are never counted in organization counts, emissions totals, or recognition counts

### Requirement: Dashboard KPIs endpoint validates year parameter

The optional `year` query parameter SHALL be validated using a Zod schema: coerced to number, positive integer, and no greater than the current year. Invalid values SHALL result in an HTTP 400 response.

#### Scenario: Non-numeric year

- **WHEN** the endpoint is called with `year=abc`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Negative year

- **WHEN** the endpoint is called with `year=-1`
- **THEN** the system SHALL respond with HTTP 400

#### Scenario: Future year

- **WHEN** the endpoint is called with a `year` greater than the current year
- **THEN** the system SHALL respond with HTTP 400

### Requirement: Dashboard KPIs route defines response schemas for all HTTP status codes

The `route.ts` file SHALL define Zod response schemas for every possible HTTP status code: 200 (success), 400 (invalid parameters), 401 (unauthenticated), 403 (forbidden), and 500 (internal server error). Successful responses SHALL return HTTP 200.

#### Scenario: Successful response

- **WHEN** the endpoint processes a valid request successfully
- **THEN** the system SHALL respond with HTTP 200 and the KPIs response body

### Requirement: Dashboard KPIs endpoint requires admin authentication

The endpoint SHALL only be accessible to authenticated users with an admin role.

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid authentication token
- **THEN** the system SHALL respond with HTTP 401

#### Scenario: Non-admin user request

- **WHEN** a request is made by an authenticated user without admin role
- **THEN** the system SHALL respond with HTTP 403
