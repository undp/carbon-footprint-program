## Requirements

### Requirement: Fetch earned badges for an organization

The system SHALL expose a `GET /organizations/:id/badges` endpoint that returns all badges earned by the organization through approved carbon inventory submissions.

Each item in the response SHALL include:

- `earningDate`: the `updatedAt` field of the approved `Submission` record (ISO datetime string)
- `measurementYear`: the `year` field of the associated `CarbonInventory`
- `badgeType`: the `type` field of the `Badge`
- `totalEmissions`: the sum of all `value` fields from `CarbonInventorySubtotalsView` for that inventory (as a number)
- `status`: the `status` field of the `Submission`
- `previewUrl`: a signed SAS URL for the badge file (same mechanism as `getCarbonInventoryBadges`)

The endpoint SHALL only return badges linked to submissions with `status = APPROVED`.

The endpoint SHALL exclude badges of type `ORGANIZATION_ACCREDITATION`.

#### Scenario: Organization has approved submissions with badges

- **WHEN** `GET /organizations/:id/badges` is called for an org with approved submissions
- **THEN** the response is `200` with an array of badge items, one per badge per approved submission

#### Scenario: Organization has no approved submissions

- **WHEN** `GET /organizations/:id/badges` is called for an org with no approved submissions
- **THEN** the response is `200` with an empty array

#### Scenario: Organization does not exist

- **WHEN** `GET /organizations/:id/badges` is called with an unknown org ID
- **THEN** the response is `404`

#### Scenario: Emissions are summed across all subcategories

- **WHEN** a carbon inventory has multiple `CarbonInventorySubtotalsView` rows
- **THEN** `totalEmissions` is the numeric sum of all `value` fields for that inventory

#### Scenario: ORGANIZATION_ACCREDITATION badges are excluded

- **WHEN** an approved submission has a badge of type `ORGANIZATION_ACCREDITATION`
- **THEN** that badge is not included in the response
