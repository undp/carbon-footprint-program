## Why

The current reduction project flow requires two separate actions: first creating an empty project record, then separately requesting verification. This two-step approach creates unnecessary complexity and inconsistency — the "INGRESAR PROYECTO" button should open a form where the user fills in all data and attaches files, submitting everything atomically as a single operation.

## What Changes

- **BREAKING**: Remove `POST /reduction-projects/:id/request-verification` endpoint — verification submission is now created inside `POST /reduction-projects/`
- **BREAKING**: `POST /reduction-projects/` now accepts full project data + required `fileUuids` (was empty body returning only `{ id }`)
- Create shared `ReductionProjectMutationDataSchema` (following organization pattern) used by both create and update schemas
- `PATCH /reduction-projects/:id` continues to accept partial mutation data + optional `fileUuids`
- `GET /reduction-projects/:id` now returns associated submission files
- Frontend form always shows the file upload section (not conditionally hidden)
- For `SUBMITTED` display status: pre-populate form with previously submitted files
- For `REVIEWED` display status: show empty file input (user must re-submit fresh files)
- Remove frontend button/logic that called `request-verification`

## Capabilities

### New Capabilities

- `reduction-project-create-with-submission`: Single endpoint creates reduction project + REDUCTION_PROJECT_VERIFICATION submission + file links atomically
- `reduction-project-files-display`: getReductionProjectById returns files; frontend shows them conditionally based on display status

### Modified Capabilities

- None (no existing specs to delta)

## Impact

- **Backend**: `createReductionProject` service, route, and types heavily modified; `requestReductionProjectVerification` feature directory deleted; `getReductionProjectById` service and mapper updated; new shared schema in `packages/types/src/reductionProjects/schemas.ts`
- **Frontend**: Reduction project form component always renders file upload; submit handler calls create instead of two-step flow; file display logic keyed on display status
- **API contract**: Breaking change to `POST /reduction-projects/` body and to `GET /reduction-projects/:id` response shape
- **Types package**: `@repo/types` exports updated (remove requestReductionProjectVerification types, add shared mutation schema)
