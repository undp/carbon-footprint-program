# get-organization-badges Specification

## Purpose

This capability exposes the organization recognitions endpoint (`GET /organizations/:id/recognitions`, feature `getOrganizationRecognitions`) that aggregates the recognitions an organization has earned across all of its approved submissions — both carbon-inventory recognitions and reduction-project recognitions. It returns, per approved submission, the earning date, measurement year, submission type, total emissions, and a signed URL for the associated recognition file, with optional filtering by year and submission type. It backs the organization-facing Recognitions screen.

## Requirements

### Requirement: Fetch earned recognitions for an organization

The system SHALL expose a `GET /organizations/:id/recognitions` endpoint that returns all recognitions earned by the organization through approved submissions. The endpoint requires authentication.

The endpoint SHALL accept two optional query parameters:

- `year`: a 4-digit year that filters results by the measurement year
- `submissionTypes`: one or more submission types to filter by (repeatable)

Each item in the response SHALL include:

- `submissionId`: the id of the approved `Submission` (string)
- `earningDate`: the `updatedAt` of the approved `Submission` as an ISO datetime string, or `null`
- `measurementYear`: the `year` of the associated carbon inventory or reduction project (integer)
- `submissionType`: the `type` of the `Submission`
- `totalEmissions`: the total emissions in tCO₂e for the carbon inventory (a number), or `null` for reduction-project recognitions
- `recognitionFileUrl`: a signed read SAS URL for the submission's recognition file, or `null` when no recognition file is attached

The endpoint SHALL only return recognitions linked to submissions whose status is `APPROVED` or `APPROVED_AUTOMATICALLY`. Results SHALL be ordered by measurement year descending, then by submission type.

#### Scenario: Organization has approved submissions with recognitions

- **WHEN** `GET /organizations/:id/recognitions` is called for an org with approved submissions
- **THEN** the response is `200` with an array of recognition items, one per approved submission

#### Scenario: Organization has no approved submissions

- **WHEN** `GET /organizations/:id/recognitions` is called for an org with no approved submissions
- **THEN** the response is `200` with an empty array

#### Scenario: Organization does not exist

- **WHEN** `GET /organizations/:id/recognitions` is called with an unknown or inactive org ID
- **THEN** the response is `404`

#### Scenario: Total emissions are summed for carbon inventories

- **WHEN** a carbon inventory has multiple subtotal rows
- **THEN** `totalEmissions` is the numeric sum of all subtotal values for that inventory, expressed in tCO₂e

#### Scenario: Reduction-project recognitions have null emissions

- **WHEN** a recognition item corresponds to a reduction-project submission
- **THEN** its `totalEmissions` is `null`

#### Scenario: Filter by year

- **WHEN** `GET /organizations/:id/recognitions?year=2024` is called
- **THEN** only recognitions whose measurement year is 2024 are returned

#### Scenario: Recognition file URL is present when a file exists

- **WHEN** an approved submission has a recognition file attached
- **THEN** the item's `recognitionFileUrl` is a signed read SAS URL for that file; otherwise it is `null`
