## MODIFIED Requirements

### Requirement: Requests KPIs endpoint supports optional year filtering

The existing `GET /api/admin/requests/kpis` endpoint SHALL accept an optional `year` query parameter. Submissions are associated to carbon inventories via the join path: `Submission → SubmissionSubject → SubmissionSubjectCarbonInventory → CarbonInventory`. For submissions without a carbon inventory association (e.g., `ORGANIZATION_ACCREDITATION`, which links to `SubmissionSubjectOrganizationData` instead), the year is determined from `Submission.createdAt`. When the `year` parameter is omitted, the endpoint SHALL behave as before (unfiltered totals).

#### Scenario: Request without year filter (backwards-compatible)

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL return the same unfiltered totals as the current behavior

#### Scenario: Request with year filter — inventory-linked submissions

- **WHEN** the endpoint is called with `year=2025` and a submission has a carbon inventory association (via `SubmissionSubjectCarbonInventory`)
- **THEN** the submission SHALL be counted only if `CarbonInventory.year = 2025`

#### Scenario: Request with year filter — submissions without inventory

- **WHEN** the endpoint is called with `year=2025` and a submission has no carbon inventory association (e.g., `ORGANIZATION_ACCREDITATION`)
- **THEN** the submission SHALL be counted only if `EXTRACT(YEAR FROM Submission.createdAt) = 2025`

#### Scenario: Invalid year parameter

- **WHEN** the endpoint is called with a non-numeric, negative, or future `year`
- **THEN** the system SHALL respond with HTTP 400
