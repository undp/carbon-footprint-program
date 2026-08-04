# Tasks

> Delivery: single PR/branch (`feat/mati/reduction-project-draft-status`), landed as two ordered commits — groups 1–6 (DB + types + utils + API + tests) first, then groups 7–10 (web) — rather than chained PRs. **Follow-up** = group 11.

## 1. Database (API)

- [x] 1.1 In `packages/database/src/prisma/schema.prisma` (`ReductionProject`), make deferred columns nullable: `implementationDate String?`, `description String?`, `subcategoryId BigInt?`, `year Int?`, `baselineScenario Decimal? @db.Decimal(15,4)`, `projectScenario Decimal? @db.Decimal(15,4)`; keep `name`, `organizationId`, `carbonInventoryId` required.
- [x] 1.2 Change the relation to `subcategory Subcategory? @relation(...)`; keep `consideredGei String[] @default([])` and `reportedElsewhere @default(false)`.
- [x] 1.3 Add a **new incremental migration** (`20260706120000_draft_reduction_project_refactor`) that drops `NOT NULL` on those columns and sets the `considered_gei` empty-array default; the create-table migration (`20260404173819_add_reduction_project`) is left untouched. This is the adopted convention going forward: every schema change ships as its own incremental migration — existing migrations are never edited in place.
- [x] 1.4 Regenerate the Prisma client (`pnpm --filter @repo/database dev:generate` or repo script).

## 2. Types (API)

- [x] 2.1 `baseSchemas/reductionProject.ts`: mark deferred fields `.nullable()` (`implementationDate`, `description`, `subcategoryId`, `year`, `baselineScenario`, `projectScenario`); keep `name`/`organizationId`/`carbonInventoryId` required.
- [x] 2.2 `createReductionProject/schemas.ts`: request = shared `ReductionProjectWriteBodySchema` (the SAME full body as update — `name`/`org`/`CI` required + deferred fields nullable-always-sent) so a single save persists a full or partial draft; no `fileUuids`. NOT a 3-field pick — RP is one form, not CI's create-shell-then-edit flow.
- [x] 2.3 `updateReductionProject/schemas.ts`: full-replace — `name`/`organizationId`/`carbonInventoryId` required, deferred fields `.nullable()` and always sent (not `.partial().optional()`); remove `fileUuids`; response `z.null()` (kills the current `z.object({})`, matches the delete convention). Note: CI's update still returns the entity — unifying it to `z.null()` is a **separate refactor** (task 11.2), not this change.
- [x] 2.4 New `requestVerification/schemas.ts`: `Params { id }`, `Body { fileUuids?: uuid[] }` (`.nullish()` like CI), `Response z.null()`.
- [x] 2.5 New `deleteReductionProject/schemas.ts`: `Params { id }`, `Response z.null()`.
- [x] 2.6 `getAllReductionProjects/schemas.ts`: make `year` nullable; add `organizationId`, `organizationDisplayStatus: OrganizationDisplayStatusSchema.nullable()` (reuse from `../../organizations`, mirror `getAllCarbonInventories/schemas.ts:54` — do not redeclare the enum), and raw completeness fields (`implementationDate`, `description`, `subcategoryId`, `consideredGei`) to the list item; keep `totalReduction` nullable; **no** server-computed `missingFields`. With the item now carrying ~8 base fields, prefer `.omit` over `.pick` like CI's `CarbonInventoryItem`.
- [x] 2.7 `getReductionProjectById/schemas.ts`: make embedded `subcategory` `.nullable()`; `year`/`implementationDate`/scenarios inherit nullability from base.
- [x] 2.8 `getReductionProjectsMinimal/schemas.ts`: make `year` nullable.
- [x] 2.9 Retire `ReductionProjectMutationDataSchema`; export new types from `packages/types/src/index.ts`.

## 3. Utils (API)

- [x] 3.1 `packages/utils/src/reductionProject.ts`: change `canRequestReductionProjectVerification` to `DRAFT || REVIEWED`; update its doc comment.
- [x] 3.2 Add `isReductionProjectDeletable(status)` (DRAFT only), mirroring `isCarbonInventoryDeletable`.
- [x] 3.3 Add pure `getReductionProjectMissingFields(project)` returning the list of missing required fields (implementationDate, description, subcategoryId, year, baselineScenario, projectScenario, non-empty consideredGei); mirror `getInventoryMissingFields`.

## 4. API — errors & services (API)

- [x] 4.1 `errors.ts`: add `ReductionProjectNotDeletableError` (422, `"... is not deletable in its current state (%s)"`); remove the unused `ReductionProjectFileAttachmentsRequiredError`.
- [x] 4.2 `createReductionProject/service.ts`: strip to a draft insert — remove `validateReductionProjectPrerequisites`, `createReductionProjectSubmission`, and file linking; insert all provided fields (deferred null when the form left them blank); keep `kind:"organization"` body-based route auth; update the route summary from "Creates an empty reduction project row" to describe saving a DRAFT.
- [x] 4.3 New `requestVerification/{route,handler,service}.ts` cloned from `carbonInventories/requestVerification`: route `POST /:id/request-verification`, `kind:"reductionProject"`, roles CONTRIBUTOR/ADMIN; handler via `createSubmissionRequestHandler`; service loads project (extend the minimal select with `organizationId` + `carbonInventoryId`), gates on `canRequestReductionProjectVerification`, runs `validateReductionProjectPrerequisites`, throws `ReductionProjectInvalidDataError` when `getReductionProjectMissingFields` is non-empty, creates the submission, links files only when `fileUuids?.length`, then `cleanupSourceObjects` — all inside the transaction.
- [x] 4.4 `updateReductionProject/route.ts`: switch auth to `kind:"reductionProject"` (roles CONTRIBUTOR/ADMIN); drop the body extractor.
- [x] 4.5 `updateReductionProject/service.ts`: remove the REVIEWED atomic branch (prereqs, submission, file linking); load project with `organizationId` in the select; gate on `isReductionProjectEditable`; **destination check** — when `body.organizationId !== project.organizationId`, require CONTRIBUTOR/ADMIN membership in the new org (membership-only query, not `validateReductionProjectPrerequisites`), else 403; write fields (incl. org/CI), set `updatedById`, `return null`; drop the `storage` param.
- [x] 4.6 New `deleteReductionProject/{route,handler,service}.ts`: `DELETE /:id`, `kind:"reductionProject"` (CONTRIBUTOR/ADMIN); service uses a single atomic conditional `updateMany` (`where: status ACTIVE && submission is null`) instead of `deleteCarbonInventory`'s read-then-write (`findUnique` → check → `update`) — TOCTOU-free, matching zero rows when the project isn't a deletable DRAFT; throws `ReductionProjectNotDeletableError` when `count === 0`, sets `updatedById`; route via `createDeleteHandler` (void body).
- [x] 4.7 `getAllReductionProjects` mapper/service: select `organization.summary` display status + `organizationId` + raw completeness fields; null-guard `totalReduction` in `mapReductionProjectToListItem`.
- [x] 4.8 `mappers.ts` (`mapPersistenceFields`, detail): null-guard `subcategory` (→ null when absent) and `baselineScenario`/`projectScenario` (→ null when unset).
- [x] 4.9 `routes/api/reduction-projects/index.ts`: register `requestVerificationRoute` and `deleteReductionProjectRoute`.

## 5. API tests (API)

- [x] 5.1 `createReductionProject.integration.test.ts`: partial data yields a DRAFT with no submission; org+CI+name required, rest optional.
- [x] 5.2 New `requestVerification.integration.test.ts`: 200 from DRAFT and from REVIEWED create a PENDING submission (with and without `fileUuids`); 403 when project missing; 422 when SUBMITTED/APPROVED (cannot-request); 422 when org not accredited / CI not verified; 422 when incomplete.
- [x] 5.3 Extend `updateReductionProject.integration.test.ts`: DRAFT save and REVIEWED save persist fields with no new submission; SUBMITTED/APPROVED → not-updatable; **member of a different org → 403** (source IDOR regression); re-parent to an org the caller belongs to → 200 with `organizationId` persisted; re-parent to an org the caller is not a member of → 403.
- [x] 5.4 New `deleteReductionProject.integration.test.ts`: DRAFT deletable → DELETED; non-DRAFT → 422 `REDUCTION_PROJECT_NOT_DELETABLE`; already-deleted / unknown id → 403.

## 6. Gate — API

- [x] 6.1 `pnpm format && pnpm lint && pnpm type-check` clean; `pnpm test --filter=api -- /reductionProjects --coverage=false` green.

## 7. Web — query hooks (Web)

- [x] 7.1 `api/query/reductionProjects/useRequestReductionProjectVerification`: POST `reduction-projects/${id}/request-verification` `{ json: body }`; invalidate RP list, RP detail/status, submission-history, admin-requests keys. Snackbar on success/error + `console.error` are not in the hook — they live in the caller, `ReductionProjectActionsCell.tsx` (`onPostulateConfirm`).
- [x] 7.2 `api/query/reductionProjects/useDeleteReductionProject`: DELETE, await without `.json()`; invalidate the list. Snackbar on success/error + `console.error` are not in the hook — they live in `ReductionProjectActionsCell.tsx` (`onDeleteConfirm`).

## 8. Web — list actions cell & dialogs (Web)

- [x] 8.1 Relocate the org-status dialogs (`Missing`/`Blocked`/`Unaccredited`) from `screens/CarbonInventories/Dialogs/*` to a shared location and import from both.
- [x] 8.2 Add `IncompleteReductionProjectDialog` (parallel to `IncompleteInventoryDialog`).
- [x] 8.3 `ReductionProjectActionsCell.tsx`: add the Postular button (`VerifiedOutlined`, tooltip "Postular a reconocimiento de reducción", `disabled={!canRequestReductionProjectVerification(status)}`); on click run `validateBeforeSubmit()` computing missing fields via `getReductionProjectMissingFields(row)` then org dialogs, else open the verify/upload dialog and submit; add a DRAFT-only delete action with confirm dialog.

## 9. Web — form / screen (Web)

- [x] 9.1 `ReductionProjectScreen.tsx`: create-mode save button → "Guardar borrador"; remove file upload from the form; relax the disabled condition so a partial draft (org + CI + name) can be saved.
- [x] 9.2 `hooks/useReductionProjectForm.ts`: resolver requires only `name`/`organizationId`/`carbonInventoryId` (others validated for format if present) for create and edit; no file requirement.
- [x] 9.3 `hooks/useReductionProjectSubmit.ts`: neither create nor edit pre-uploads files or sends `fileUuids`; adjust `mapFormValuesToMutationData` for nullable/omitted deferred fields.
- [x] 9.4 Re-parenting UX (align front with the API's re-parent capability): the org picker stays **editable** in edit mode (do **not** disable it), sourced from `useMyOrganizations` (already the source in create). Do **not** add org→CI refilter plumbing — org/CI coherence is enforced at submit (consistent with the "user owns consistency" stance), same as create now that create skips prereqs. Role-filtering of the org list is a pre-existing concern shared with create; inherit whatever create does.
- [x] 9.5 Null-safe rendering across the list grid and detail/view screen (no `split` on possibly-null dates; justify every `!`). In `ReductionProjectsScreen.tsx` the year filter is **client-side**: exclude null when building `availableYears` (`.filter((y) => y != null)`) so a null-year draft doesn't produce an empty/`"null"` dropdown option; null-year drafts appear only in the unfiltered view. Check CI's list (`year Int?` too) for the same null-in-dropdown issue.

## 10. Web — VOCAB & gate

- [x] 10.1 `labels/chips/reductionProject.ts`: fix tooltips to "reconocimiento de reducción" (not "sello").
- [x] 10.2 `pnpm format && pnpm lint && pnpm type-check` clean; manual E2E via app-browser (create draft → edit/guardar borrador → Postular incomplete shows dialogs → complete → SUBMITTED → review → REVIEWED → edit → re-Postular → SUBMITTED; delete a DRAFT; delete of a non-draft blocked). (manual E2E passed 2026-07-09: create draft → edit → Postular file+declaration gate → draft-only delete, verified in the running app)

## 11. Follow-up

- [ ] 11.1 Open a GitHub issue for the deferred reviewer-visibility leak (submissions carry no snapshot; reviewers read live entity data — affects CI + RP; proposed fix = snapshot-on-submit). (tracked: https://github.com/undp/carbon-footprint-program/issues/473)
- [ ] 11.2 Refactor-list item (separate change): unify the update-response convention to `z.null()` across the repo — CI's `UpdateCarbonInventoryResponseSchema` currently returns the entity. Verify no CI front consumer reads the update body (they should invalidate + refetch) before switching.
