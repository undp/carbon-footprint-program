## Why

Today a reduction project is **created and submitted for verification in a single atomic step**: `POST /api/reduction-projects` validates all prerequisites, inserts the row, and immediately creates a `REDUCTION_PROJECT_VERIFICATION` submission — so a project jumps straight to SUBMITTED and there is no way to save a work-in-progress. The DRAFT machinery already exists but is half-wired and unreachable (`ReductionProjectDisplayStatusEnum.DRAFT`, `calculateReductionProjectDisplayStatus` returning DRAFT, `canRequestReductionProjectVerification`, unused error classes). This change finishes that abandoned flow so reduction projects behave like the carbon-inventory (CI) verification flow: **create = savable DRAFT, then an explicit "Postular a reconocimiento de reducción" action submits for verification**. While in these files it also closes a cross-tenant authorization gap on update and a null-mapper crash that the nullable-draft columns would otherwise trigger.

## What Changes

- **Create = DRAFT.** `POST /reduction-projects` only saves a draft: no prerequisite checks, no submission, no files at create. It accepts the **full write body** (same shape as update): `name` + organization + carbon inventory required, every other field nullable-and-always-sent — so a single save persists a complete or partial draft (blank fields stored null). Full validation is deferred to submit.
- **New `POST /:id/request-verification`** (mirrors CI's `requestVerification`). The single submit path for **both** the DRAFT first-submit and the REVIEWED re-submit. Files optional. Prerequisites (org ACTIVE + accredited, linked CI has an APPROVED verification) and completeness are enforced **here**, inside the transaction.
- **`PATCH /:id` becomes field-edit-only** (no submission), for DRAFT and REVIEWED. **BREAKING (behavior):** it no longer creates a submission or links files, and `fileUuids` is removed from its contract. It gains **two-sided authorization** to close a cross-tenant re-parenting IDOR: auth resolves the project's org from `:id` (source), and the service additionally requires membership in the destination org when `organizationId` changes. `organizationId`/`carbonInventoryId` stay editable (re-parenting is allowed for the authorized).
- **New `DELETE /:id`** soft-delete, allowed only while DRAFT.
- **Web:** the list `ReductionProjectActionsCell` gains a **Postular** action (opens the CI-style upload dialog + incomplete/org validation modals) and a DRAFT-only **delete** action. The form's save button reads **"Guardar borrador"** in create mode; file upload is removed from the form entirely (files live only in the Postular dialog). Null-safe rendering for nullable fields. VOCAB fix on the reduction-project chip tooltips ("reconocimiento", not "sello").
- **Bug fix (blocking):** the detail/getById mapper (`mapPersistenceFields`) is null-guarded for `subcategory` and the scenario decimals — otherwise opening any DRAFT's detail crashes once those columns are nullable.
- **Follow-up (task):** open a GitHub issue for the deferred reviewer-visibility leak (submissions carry no snapshot; reviewers read live entity data — affects CI and RP alike).

## Capabilities

### New Capabilities

- `reduction-project-lifecycle`: The DRAFT → SUBMITTED → APPROVED/REJECTED/REVIEWED lifecycle of a reduction project — derived display status, savable partial drafts, the explicit request-verification submit (first-submit and post-review re-submit), draft-only soft-delete, and the authorization rules governing edit/submit/delete.

### Modified Capabilities

<!-- None. No existing capability spec covers reduction-project behavior today; this introduces it. -->

## Impact

- **Database** (`packages/database/src/prisma/schema.prisma`): the `ReductionProject` deferred columns become nullable (`implementationDate`, `description`, `subcategoryId`, `year`, `baselineScenario`, `projectScenario`; `subcategory` relation optional). Because the create-table migration is already applied in QA environments, an **incremental migration** (`..._draft_reduction_project_refactor`) drops the `NOT NULL` constraints and sets the `considered_gei` empty-array default, then the Prisma client is regenerated — editing the create-table migration in place would break its checksum against the deployed history.
- **API contract (behavioral)**: `POST /reduction-projects` no longer creates a submission and drops `fileUuids`; `PATCH /:id` drops `fileUuids` and stops creating submissions; two **new** routes (`POST /:id/request-verification`, `DELETE /:id`). The `PATCH` update-response becomes `z.null()`.
- **Authorization**: `PATCH /:id` and the two new routes move to `kind:"reductionProject"` (org resolved from `:id`); `PATCH` adds a destination-org membership check for re-parenting. `errors.ts` gains `ReductionProjectNotDeletableError` and drops the now-unused `ReductionProjectFileAttachmentsRequiredError`.
- **Types** (`packages/types/src/reductionProjects/*`, `baseSchemas/reductionProject.ts`): nullable deferred fields; new `requestVerification`/`deleteReductionProject` schemas; list/detail/minimal schemas updated (nullable `year`, nullable embedded `subcategory`, raw completeness fields on the list item); retire `ReductionProjectMutationDataSchema`.
- **Utils** (`packages/utils/src/reductionProject.ts`): `canRequestReductionProjectVerification` → DRAFT|REVIEWED; add `isReductionProjectDeletable` and the shared `getReductionProjectMissingFields` completeness helper (used by both the submit gate and the client pre-check).
- **Web** (`apps/web/src`): actions cell, two new query hooks (`useRequestReductionProjectVerification`, `useDeleteReductionProject`), form/screen/hooks changes, shared org-status dialogs relocated for reuse, chip-tooltip VOCAB fix.
- **Tests** (`apps/api/test/features/reductionProjects/`): update `createReductionProject`; new `requestVerification` and `deleteReductionProject` suites; extend `updateReductionProject` (including the cross-org 403 regression for the IDOR).
- **Delivery**: large full-stack change shipped as a **single PR** on one branch (`feat/mati/reduction-project-draft-status`), landed as two ordered commits — API (DB + types + utils + services + integration tests) first, then web — rather than chained PRs.
- **Out of scope**: snapshot-on-submit (reviewer-visibility fix) — tracked as a follow-up issue, not implemented here.
