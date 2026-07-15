## ADDED Requirements

### Requirement: Reduction projects are created as savable drafts

Creating a reduction project SHALL persist a draft from a single request carrying the full write body (the same body shape as update). `organizationId`, `carbonInventoryId`, and `name` are required; every other business field is nullable and always sent, so one save persists whatever the form filled — a complete draft or a partial one, with blank fields stored as null. Create MUST NOT run submission prerequisites, MUST NOT create a verification submission, and MUST NOT attach files. The caller MUST be a CONTRIBUTOR or ADMIN member of the target organization.

#### Scenario: Complete first save persists every field

- **WHEN** an authorized member creates a reduction project with the whole form filled in
- **THEN** every provided field is persisted on the new project in that single request
- **AND** no verification submission is created (its derived display status is DRAFT)

#### Scenario: Partial draft leaves deferred fields blank

- **WHEN** an authorized member creates a reduction project sending `organizationId`, `carbonInventoryId`, and `name` with the remaining fields blank (null)
- **THEN** the project is persisted with those fields null
- **AND** its derived display status is DRAFT

#### Scenario: Create omits a required field

- **WHEN** a create request is missing `organizationId`, `carbonInventoryId`, or `name`
- **THEN** the request is rejected with a validation error

#### Scenario: Create does not require submission prerequisites

- **WHEN** a draft is created against an organization that is not yet accredited, or a carbon inventory without an approved verification
- **THEN** the draft is still created successfully (prerequisites are checked only at submit)

### Requirement: Reduction project display status is derived, not persisted

The display status SHALL be derived from the project's persistence status and its verification submissions. A project with persistence status DELETED SHALL derive as DELETED. A non-deleted project with no `REDUCTION_PROJECT_VERIFICATION` submission SHALL derive as DRAFT. Otherwise the status is chosen by a fixed precedence over the submission statuses present: APPROVED, then PENDING (→ SUBMITTED), then REVIEWED, then REJECTED (i.e. an APPROVED submission wins even if a later PENDING one exists).

#### Scenario: No verification submission yields DRAFT

- **WHEN** a project has no `REDUCTION_PROJECT_VERIFICATION` submission
- **THEN** its display status is DRAFT

#### Scenario: A pending submission yields SUBMITTED

- **WHEN** a project's latest verification submission is PENDING
- **THEN** its display status is SUBMITTED

### Requirement: Drafts and reviewed projects can be edited without submitting

Updating a reduction project (`PATCH /:id`) SHALL edit fields only and MUST NOT create a verification submission or attach files, for both DRAFT and REVIEWED projects. Editing SHALL be permitted only when the display status is DRAFT or REVIEWED; any other status MUST be rejected as not-updatable.

#### Scenario: Editing a draft persists fields and stays DRAFT

- **WHEN** an authorized member edits a DRAFT project's fields
- **THEN** the fields are persisted
- **AND** the project remains DRAFT with no new submission created

#### Scenario: Editing a reviewed project stays REVIEWED

- **WHEN** an authorized member edits a REVIEWED project's fields
- **THEN** the fields are persisted
- **AND** the project remains REVIEWED with no new submission created

#### Scenario: Editing a submitted or approved project is blocked

- **WHEN** an edit targets a SUBMITTED or APPROVED project
- **THEN** the request is rejected as not-updatable

### Requirement: Editing enforces two-sided authorization

Editing SHALL authorize against the organization that currently owns the project, resolved from the project `:id` (the source). When an edit changes `organizationId` (re-parenting), the service SHALL additionally require the caller to be a CONTRIBUTOR or ADMIN member of the destination organization. A caller lacking membership on either side MUST be rejected with 403.

#### Scenario: Non-member of the owning org cannot edit

- **WHEN** a caller who is not a member of the project's current organization attempts to edit it
- **THEN** the request is rejected with 403

#### Scenario: Re-parenting into an org the caller belongs to succeeds

- **WHEN** an authorized member re-parents a project to another organization where they are also a CONTRIBUTOR/ADMIN
- **THEN** the new `organizationId` is persisted

#### Scenario: Re-parenting into an org the caller does not belong to is blocked

- **WHEN** a caller changes `organizationId` to an organization where they are not a member
- **THEN** the request is rejected with 403 and the change is not persisted

### Requirement: An explicit action submits a reduction project for verification

`POST /:id/request-verification` SHALL create a new PENDING `REDUCTION_PROJECT_VERIFICATION` submission. It SHALL serve both the first submit (from DRAFT) and the re-submit (from REVIEWED); no other display status may submit. Attaching files SHALL be optional. All checks and the submission creation MUST occur within a single transaction.

#### Scenario: Submitting a draft creates a pending submission

- **WHEN** an authorized member requests verification for a complete DRAFT project
- **THEN** a PENDING `REDUCTION_PROJECT_VERIFICATION` submission is created
- **AND** the project's display status becomes SUBMITTED

#### Scenario: Submitting with and without files both succeed

- **WHEN** verification is requested with `fileUuids` present, and separately with `fileUuids` absent
- **THEN** both create a PENDING submission (files are optional)

#### Scenario: Re-submitting a reviewed project

- **WHEN** an authorized member requests verification for a REVIEWED project
- **THEN** a new PENDING submission is created reusing the existing submission subject
- **AND** the project's display status becomes SUBMITTED

#### Scenario: Submitting from a non-submittable status is rejected

- **WHEN** verification is requested for a SUBMITTED, APPROVED, or REJECTED project
- **THEN** the request is rejected as cannot-request-verification (422)

#### Scenario: Submitting a project the caller cannot access is rejected

- **WHEN** verification is requested for a project the caller has no access to (or that does not exist / is deleted)
- **THEN** the request is rejected with 403

### Requirement: Prerequisites and completeness are enforced at submit only

At submit, the linked carbon inventory MUST be ACTIVE, belong to the project's organization, and have an APPROVED `CARBON_INVENTORY_VERIFICATION`; the organization MUST be ACTIVE and accredited. The project MUST also have all required business fields present. These checks SHALL run at submit and NOT at create or edit.

#### Scenario: Incomplete project cannot be submitted

- **WHEN** verification is requested for a project missing any required business field (implementation date, description, subcategory, year, baseline/project scenarios, or considered GEI)
- **THEN** the request is rejected as invalid-data (422)

#### Scenario: Unaccredited org or unverified inventory blocks submit

- **WHEN** verification is requested while the organization is not accredited or the linked inventory has no approved verification
- **THEN** the request is rejected (422)

### Requirement: Only drafts can be deleted

`DELETE /:id` SHALL soft-delete a reduction project and SHALL be permitted only while the display status is DRAFT. Deleting any non-draft status MUST be rejected as not-deletable. Deleting a project the caller cannot access (already deleted or unknown) MUST be rejected with 403.

#### Scenario: Deleting a draft soft-deletes it

- **WHEN** an authorized member deletes a DRAFT project
- **THEN** the project's persistence status becomes DELETED and it no longer appears in the list

#### Scenario: Deleting a non-draft is blocked

- **WHEN** a delete targets a SUBMITTED, REVIEWED, APPROVED, or REJECTED project
- **THEN** the request is rejected as not-deletable (422)

#### Scenario: Deleting an inaccessible project

- **WHEN** a delete targets an already-deleted or unknown project
- **THEN** the request is rejected with 403

### Requirement: List and detail views render partial drafts

The reduction-project list and detail responses SHALL render projects with nullable business fields without error. `totalReduction` SHALL be null when either scenario value is unset. The detail view SHALL render a null subcategory and null scenarios without crashing.

#### Scenario: Listing a draft with unset scenarios

- **WHEN** the list includes a DRAFT with null baseline/project scenarios
- **THEN** `totalReduction` is null and the list renders without error

#### Scenario: Viewing the detail of an incomplete draft

- **WHEN** the detail of a DRAFT with no subcategory and null scenarios is requested
- **THEN** the response renders those fields as null without error

### Requirement: The submit action is presented in the list with guided validation

The reduction-project list SHALL offer a "Postular a reconocimiento de reducción" action, enabled only when the display status is DRAFT or REVIEWED. Before submitting, it SHALL surface the reason a project cannot be submitted (incomplete fields, or missing/blocked/unaccredited organization) via explanatory dialogs, and otherwise open the file-upload dialog to complete the submission. A draft-only delete action SHALL also be offered.

#### Scenario: Postular on an incomplete draft explains what is missing

- **WHEN** the user clicks Postular on a draft with missing required fields
- **THEN** an "incomplete project" dialog lists what must be completed instead of submitting

#### Scenario: Postular on a ready project opens the upload dialog

- **WHEN** the user clicks Postular on a complete project in an accredited organization
- **THEN** the file-upload/verification dialog opens and submission proceeds

#### Scenario: Delete action is offered only for drafts

- **WHEN** the list renders a DRAFT project
- **THEN** a delete action is available for it, and it is absent for non-draft projects
