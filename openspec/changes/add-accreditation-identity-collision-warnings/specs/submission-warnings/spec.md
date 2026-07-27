## ADDED Requirements

### Requirement: Admin submission warnings endpoint

The system SHALL expose `GET /admin/submissions/:id/warnings` that returns a JSON array of warnings for the given submission. The endpoint SHALL be restricted to users with the `ADMIN` or `SUPERADMIN` role. The set of warnings SHALL be computed on demand (lazily) per request, dispatched by the submission's `type`; submission types with no warning logic SHALL return an empty array. The endpoint SHALL be generic so that additional submission types can contribute their own warning kinds without changing the response contract.

#### Scenario: Admin requests warnings for a submission

- **WHEN** a user with role `ADMIN` or `SUPERADMIN` calls `GET /admin/submissions/:id/warnings` for an existing submission
- **THEN** the system SHALL respond `200` with a JSON array of warning objects (possibly empty)

#### Scenario: Non-admin is forbidden

- **WHEN** a user without the `ADMIN`/`SUPERADMIN` role calls the endpoint
- **THEN** the system SHALL respond with an authorization error and SHALL NOT return warnings

#### Scenario: Unknown submission

- **WHEN** the `id` does not match an existing submission
- **THEN** the system SHALL respond with a not-found error

#### Scenario: Submission type without warning logic

- **WHEN** the submission's `type` has no warning computation defined (e.g. any non-accreditation type today)
- **THEN** the system SHALL respond `200` with an empty array

### Requirement: Generic warning shape

Each warning returned by the endpoint SHALL be a generic object with the fields `type` (string identifier of the warning kind), `message` (a human-readable summary in Spanish), and `metadata` (a free-form object whose shape depends on `type`). Consumers SHALL be able to branch on `type` to interpret `metadata`.

#### Scenario: Warning object structure

- **WHEN** the endpoint returns a warning
- **THEN** the warning SHALL contain a string `type`, a non-empty Spanish `message`, and a `metadata` object

### Requirement: Organization-accreditation identity-collision detection

For a submission of type `ORGANIZATION_ACCREDITATION`, the system SHALL detect identity collisions between the applicant submission's organization data and other organizations, comparing **field to same field** — `legalName` vs `legalName`, `tradeName` vs `tradeName`, and `taxId` vs `taxId` — using exact, case-insensitive, whitespace-trimmed matching. A collision SHALL only be reported against a **different** organization (`organizationId` differs from the applicant's). The applicant's own organization (including its other data versions) SHALL be excluded. Each collision SHALL produce a warning of type `ORGANIZATION_IDENTITY_COLLISION`; a single organization MAY produce more than one warning when it collides in more than one state (its approved snapshot and a pending edit both match) — such warnings SHALL NOT be merged. Two collision states SHALL be distinguished:

- `APPROVED` — the conflicting organization is accredited; the comparison SHALL use that organization's **approved** organization-data snapshot (the one linked to an `APPROVED`/`APPROVED_AUTOMATICALLY` submission), NOT the summary view's displayed/pending row.
- `PENDING` — the conflicting organization has a pending submission; the comparison SHALL use that pending organization data.

Collisions arising from multiple branches (sedes) of the same real company SHALL be reported as awareness signals, not suppressed.

#### Scenario: Legal-name collision with an accredited organization

- **WHEN** the applicant's `legalName` exactly matches (case-insensitive) the `legalName` of the approved snapshot of a different, accredited organization
- **THEN** the endpoint SHALL return a warning with `type = ORGANIZATION_IDENTITY_COLLISION`, `collisionState = APPROVED`, and `collisionFields` including `legalName`

#### Scenario: Trade-name collision with another pending submission

- **WHEN** the applicant's `tradeName` exactly matches the `tradeName` of a different organization that has a pending submission
- **THEN** the endpoint SHALL return a warning with `collisionState = PENDING` and `collisionFields` including `tradeName`

#### Scenario: Tax-id (RUT) collision

- **WHEN** the applicant's `taxId` exactly matches (normalized) the `taxId` of a different organization
- **THEN** the endpoint SHALL return a warning whose `collisionFields` includes `taxId`

#### Scenario: Stored value with surrounding whitespace

- **WHEN** a different organization's stored identity value differs from the applicant's only by surrounding whitespace and/or letter case (values are stored verbatim; nothing trims on write)
- **THEN** the collision SHALL still be detected — normalization SHALL apply to both sides of the comparison, not only to the applicant's value

#### Scenario: Comparison uses the approved snapshot, not the displayed row

- **WHEN** a conflicting accredited organization has an approved snapshot (v1) that differs from its currently displayed/pending row (v2), and the collision is against the approved snapshot's value
- **THEN** the warning SHALL still be produced, using the approved snapshot's values (the collision SHALL NOT be missed because the displayed row differs)

#### Scenario: Applicant's own organization is excluded

- **WHEN** the applicant organization has a previously approved snapshot with matching field values
- **THEN** no warning SHALL be produced for the applicant's own organization

#### Scenario: No collision

- **WHEN** none of the applicant's identity fields match any other organization
- **THEN** the endpoint SHALL return an empty array

#### Scenario: Multiple conflicting organizations

- **WHEN** the applicant's fields collide with more than one other organization
- **THEN** the endpoint SHALL return one warning per conflicting organization

#### Scenario: Organization colliding in both states

- **WHEN** a conflicting organization's approved snapshot AND its pending edit both match the applicant
- **THEN** the endpoint SHALL return two separate warnings for that organization — one with `collisionState = APPROVED` and one with `collisionState = PENDING`

#### Scenario: Branch (sede) awareness

- **WHEN** a different organization shares an identity field value with the applicant (e.g. same `legalName`, different `tradeName`)
- **THEN** the collision SHALL be reported (surfaced as an awareness signal), regardless of whether the two organizations share a `taxId`

### Requirement: Collision warning payload and ordering

An `ORGANIZATION_IDENTITY_COLLISION` warning's `metadata` SHALL include the conflicting organization's identifier (`organizationId`), its full identity tuple (`taxId`, `legalName`, `tradeName`), the `collisionState` (`APPROVED` or `PENDING`), `collisionFields` (the list of fields that matched), and the `applicant` identity tuple that was actually compared. The returned warnings SHALL be ordered with `APPROVED` (accredited) collisions before `PENDING` collisions; within a state, order SHALL be deterministic across requests. This payload SHALL make the conflicting organization's approved snapshot values available to the client, which no other endpoint exposes today.

Carrying `applicant` in the payload SHALL be the only source the client uses for the applicant side of the comparison: the submission-history response exposes the organization's _displayed_ snapshot (`organization_summary_view` ranks `PENDING` above `APPROVED`), which is not necessarily the snapshot the collision was computed from.

#### Scenario: Payload carries both tuples

- **WHEN** a collision warning is returned
- **THEN** its `metadata` SHALL contain `organizationId`, `taxId`, `legalName`, `tradeName`, `collisionState`, a non-empty `collisionFields` array, and an `applicant` tuple holding the compared `taxId`, `legalName` and `tradeName`

#### Scenario: Accredited collisions ordered first

- **WHEN** the endpoint returns both `APPROVED` and `PENDING` collision warnings
- **THEN** all `APPROVED` warnings SHALL appear before any `PENDING` warning

### Requirement: Inline conflict presentation in the review dialog

When an admin opens the accreditation review dialog for a submission that has identity-collision warnings, the web application SHALL display a dedicated "Conflictos detectados" section, shown only for organization-accreditation submissions and only when at least one warning is present. Warnings SHALL be grouped by collision state (accredited first, then pending). Each conflicting organization SHALL be shown as a collapsed chip (state, RUT, legal name) that expands to a side-by-side comparison of the applicant and the conflicting organization across the three identity fields, with the colliding field visually highlighted. The section SHALL NOT navigate the admin away from the dialog to resolve the conflict. All section text SHALL be in Spanish.

#### Scenario: Conflicts section shown when warnings exist

- **WHEN** the admin opens the review dialog of an organization-accreditation submission that has one or more collision warnings
- **THEN** a "Conflictos detectados" section SHALL be displayed, with one chip per conflicting organization grouped by state

#### Scenario: No section when there are no warnings

- **WHEN** the submission has no collision warnings (or is not an organization-accreditation submission)
- **THEN** the conflicts section SHALL NOT be rendered

#### Scenario: Expanding a chip shows the field comparison

- **WHEN** the admin expands a conflicting-organization chip
- **THEN** the UI SHALL show a side-by-side comparison of the applicant's and the conflicting organization's `tradeName`, `legalName`, and `taxId`, highlighting the field(s) that collide
- **AND** both columns SHALL be rendered from the warning payload's tuples, so the highlighted cells always show the values that were compared
