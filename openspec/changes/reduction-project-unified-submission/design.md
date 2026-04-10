## Context

Currently, creating a reduction project and submitting it for verification are two separate HTTP calls:

1. `POST /reduction-projects/` → creates empty record, returns `{ id }`
2. `POST /reduction-projects/:id/request-verification` → creates submission + links files

The frontend "INGRESAR PROYECTO" button triggers the first call immediately on click, then the form uses the returned ID for subsequent updates and finally calls request-verification. This creates orphaned draft records when users abandon the form mid-way and forces the client to manage a two-phase commit manually.

The new UX navigates to a new screen with the full form on button click without any backend call. The form collects all project data + files, and a single `POST /reduction-projects/` creates everything atomically.

## Goals / Non-Goals

**Goals:**

- Atomic creation: reduction project + submission + file links in one transaction
- Remove `request-verification` endpoint entirely
- Shared mutation schema used by both create and update (following organization pattern)
- `GET /reduction-projects/:id` returns files associated with the latest submission
- Frontend form always renders file upload section
- SUBMITTED status: form is fully read-only (fields + files non-interactive)
- REVIEWED status: form is editable with empty file input; submitting calls PATCH and creates a new submission

**Non-Goals:**

- Changing authorization model or roles
- Modifying other submission types
- Changing file upload/pre-upload flow (files are still pre-uploaded and passed as UUIDs)
- Pagination or filtering for attached files

## Decisions

### D1: Shared mutation schema in `packages/types/src/reductionProjects/schemas.ts`

Following the organization pattern (`packages/types/src/organizations/schemas.ts`), all content fields are defined once in `ReductionProjectMutationDataSchema`. Create and update schemas compose from it:

- `CreateReductionProjectRequestSchema` = `ReductionProjectMutationDataSchema` + required `fileUuids: string[]`
- `UpdateReductionProjectRequestSchema` = `ReductionProjectMutationDataSchema.partial()` + optional `fileUuids?: string[]` (at-least-one validation retained)

**Alternative considered**: Keep separate schemas. Rejected because it duplicates field definitions and makes future field additions error-prone.

### D2: createReductionProject creates submission unconditionally

Every successful `POST /reduction-projects/` will create both a `ReductionProject` record and a `REDUCTION_PROJECT_VERIFICATION` submission in one Prisma transaction. `fileUuids` is required (non-empty array) — the user must attach files to create a project.

**Alternative considered**: Make fileUuids optional at create time, allow drafts with no submission. Rejected because the new UX requirement is that users fill the form completely before submitting, eliminating the draft-without-submission state.

### D3: File display keyed on display status

`getReductionProjectById` joins submission files from the most recent submission. The response includes a `files` array (empty if none). The frontend decides what to show:

- DRAFT / REJECTED / APPROVED: no files shown (shouldn't be reachable with this new flow, but safe default)
- SUBMITTED: entire form is read-only — all fields and files are displayed but non-interactive
- REVIEWED: show empty file input — the reviewer has returned the project for re-submission, so new files are required
- APPROVED: read-only, files visible if desired (out of scope for this change)

**Alternative considered**: Return files always and let backend decide per-status. Rejected: status-based filtering in the backend couples response shape to UI logic; frontend can make this decision with the data it has.

### D5: updateReductionProject creates a new submission when project is REVIEWED

When `PATCH /reduction-projects/:id` is called with `fileUuids` and the project's current display status is `REVIEWED`, the service MUST create a new `REDUCTION_PROJECT_VERIFICATION` submission (not reuse or mutate the existing reviewed one) and link the new files to it. This is the re-submission flow for projects that have been reviewed and returned.

The existing `updateReductionProject` service already has conditional submission creation logic when files are present — this decision confirms that logic covers the REVIEWED → re-submitted transition specifically.

**Alternative considered**: A dedicated re-submission endpoint. Rejected because PATCH already has the necessary file-linking logic and adding another endpoint adds surface area without benefit.

### D4: No response shape change for createReductionProject

Create still returns `{ id }`. The client needs the ID to navigate to the project. Returning the full project would be premature optimization.

## Risks / Trade-offs

- **Orphaned files risk** → `cleanupSourceBlobs()` is called after the transaction commits; if the process crashes between commit and cleanup, source blobs remain in temporary storage. This is the existing pattern and acceptable (blobs expire or are cleaned by a background job).
- **Breaking change to POST body** → Any client calling `POST /reduction-projects/` with an empty body will fail. Since this is an internal monorepo, all callers are updated together.
- **REVIEWED re-submission UX** → Users lose reference to previously submitted files. Mitigation: display a read-only summary of prior files alongside the empty input if needed (out of scope for this change, can be added later).

## Migration Plan

1. Deploy backend changes (new create schema, removed request-verification endpoint)
2. Deploy frontend changes (updated form, removed two-step flow)
3. No database migration needed — no schema changes, only behavior changes
4. Rollback: revert both deployments together (atomic frontend+backend deploy assumed)

## Resolved Decisions

- **fileUuids required on create**: Confirmed required (min 1). Empty array is a validation error.
- **SUBMITTED form editability**: Confirmed read-only. All fields and files are non-interactive.
- **REVIEWED re-submission endpoint**: Confirmed via PATCH. See D5.
- **Files returned by getById**: Confirmed most recent submission regardless of status.
- **APPROVED files detail view**: Deferred to a future change.
