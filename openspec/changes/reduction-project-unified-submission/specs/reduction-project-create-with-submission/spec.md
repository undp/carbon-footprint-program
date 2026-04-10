## ADDED Requirements

### Requirement: Shared mutation schema for reduction projects

A `ReductionProjectMutationDataSchema` SHALL be defined in `packages/types/src/reductionProjects/schemas.ts` containing all content fields: name, organizationId, carbonInventoryId, implementationDate, description, subcategoryId, gwpUsed, useNationalGwp, consideredGei, reportedElsewhere, reportedElsewhereDescription, year, baselineScenario, projectScenario. The `CreateReductionProjectRequestSchema` and `UpdateReductionProjectRequestSchema` MUST compose from this shared schema.

#### Scenario: Create schema uses full mutation data plus required files

- **WHEN** `CreateReductionProjectRequestSchema` is evaluated
- **THEN** it includes all fields from `ReductionProjectMutationDataSchema` plus a required non-empty `fileUuids: string[]` array

#### Scenario: Update schema uses partial mutation data plus optional files

- **WHEN** `UpdateReductionProjectRequestSchema` is evaluated
- **THEN** all `ReductionProjectMutationDataSchema` fields are optional, `fileUuids` is optional, and at least one field or `fileUuids` must be present

### Requirement: Remove requestReductionProjectVerification endpoint

The `POST /reduction-projects/:id/request-verification` endpoint SHALL be removed. Its feature directory, route registration, and associated types in `@repo/types` MUST be deleted.

#### Scenario: Removed endpoint returns 404

- **WHEN** a client calls `POST /reduction-projects/:id/request-verification`
- **THEN** the server returns 404 (route no longer exists)

### Requirement: createReductionProject accepts full project data and creates submission atomically

`POST /reduction-projects/` SHALL accept the full `CreateReductionProjectRequestSchema` body and, within a single Prisma transaction, create the reduction project record, create a `REDUCTION_PROJECT_VERIFICATION` submission, and link the provided files to that submission.

#### Scenario: Successful creation with files

- **WHEN** a valid `POST /reduction-projects/` request is sent with all required fields and a non-empty `fileUuids` array
- **THEN** a new `ReductionProject` is created, a `REDUCTION_PROJECT_VERIFICATION` submission is created and linked, all files are linked to the submission, and the response returns `{ id }` of the new project

#### Scenario: Transaction rolls back on file link failure

- **WHEN** `linkFilesToSubmission` throws during the transaction
- **THEN** neither the reduction project nor the submission is persisted, and an error is returned to the client

#### Scenario: Source blobs are cleaned up after successful transaction

- **WHEN** the transaction commits successfully
- **THEN** `cleanupSourceBlobs()` is called with the provided `fileUuids` to remove temporary blobs

#### Scenario: Missing required fields returns validation error

- **WHEN** `POST /reduction-projects/` is called with an empty body or missing required fields
- **THEN** the server returns a 400 validation error

#### Scenario: Empty fileUuids array returns validation error

- **WHEN** `POST /reduction-projects/` is called with `fileUuids: []`
- **THEN** the server returns a 400 validation error (at least one file required)

### Requirement: Frontend navigates to a new screen on button click without pre-creating a record

The "INGRESAR PROYECTO" button SHALL navigate the user to a new screen with the full form without making any API call. The API call MUST only occur when the user submits the completed form.

#### Scenario: Button click navigates to new screen

- **WHEN** the user clicks "INGRESAR PROYECTO"
- **THEN** the user is navigated to a new screen with the empty form and no `POST /reduction-projects/` call is made

#### Scenario: Form submission creates project

- **WHEN** the user fills in all required fields, attaches files, and submits the form
- **THEN** a single `POST /reduction-projects/` call is made with the full payload
