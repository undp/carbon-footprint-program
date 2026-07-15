## Context

Reduction projects today are created and submitted atomically: `createReductionProject/service.ts` validates prerequisites, inserts the row, and creates a `REDUCTION_PROJECT_VERIFICATION` submission in one transaction — so there is no DRAFT state a user can save and return to. The carbon-inventory (CI) domain already solved this exact problem: `create` saves a draft, and a separate `requestVerification` endpoint submits. The DRAFT scaffolding for reduction projects already exists but is unreachable: `ReductionProjectDisplayStatusEnum.DRAFT`, `calculateReductionProjectDisplayStatus()` returning DRAFT for a project with no verification submission, `canRequestReductionProjectVerification()`, `isReductionProjectEditable()`, and two declared-but-unused error classes.

This change wires that flow up by **mirroring CI** wherever the domains are analogous, so reviewers can reason by analogy and the two flows stay convergent. Two issues surfaced while grounding the design in the code and are folded in: (1) the update route authorizes against the organization named in the request body rather than the project's actual owner, and (2) the getById mapper dereferences soon-to-be-nullable columns unconditionally.

Constraints: the create-table migration is already applied in QA, so the nullability change ships as an incremental migration (editing it in place would break the deployed migration history) — the adopted convention going forward; strict typing and Zod contracts in `packages/types`; Spanish-only UI; delivered as a single PR/branch, not chained PRs.

## Goals / Non-Goals

**Goals:**

- `create` saves a DRAFT from the full write body (org + CI + name required; other fields nullable-always-sent), so a single save persists a complete or partial draft; no submission, no files, no prerequisites at create.
- A single explicit submit path (`POST /:id/request-verification`) that serves both the DRAFT first-submit and the REVIEWED re-submit, mirroring CI; files optional; prerequisites and completeness enforced there, inside the transaction.
- `PATCH /:id` is field-edit-only for DRAFT and REVIEWED, with correct two-sided authorization.
- Draft-only soft-delete (`DELETE /:id`).
- Nullable deferred columns with null-safe list/detail rendering.
- Web: submit + delete surfaced in the list actions cell; "Guardar borrador" in the form; no file upload in the form.

**Non-Goals:**

- **Snapshot-on-submit.** Submissions carry no snapshot; reviewers read live entity data. A user editing a REVIEWED project exposes un-re-submitted edits to a reviewer. This is CI's existing behavior; RP inherits it. Tracked as a follow-up issue (would fix CI + RP together), not implemented here.
- **Atomic update+submit.** All submissions go through `request-verification`; `PATCH` never submits.
- **A persisted DRAFT enum value.** DRAFT stays derived.

## Decisions

### DRAFT is derived, not persisted

Keep `ReductionProjectStatus = ACTIVE | DELETED`; DRAFT = an ACTIVE project with no `REDUCTION_PROJECT_VERIFICATION` submission, as `calculateReductionProjectDisplayStatus()` already computes. **Alternative considered:** a new Prisma enum value — rejected because it duplicates state already implied by the submissions and diverges from CI.

### Deferred columns become nullable; completeness deferred to submit

`implementationDate`, `description`, `subcategoryId`, `year`, `baselineScenario`, `projectScenario` become nullable (and the `subcategory` relation optional); `consideredGei` stays an array defaulting to empty (empty = "not provided"). The change ships as an **incremental migration** because the create-table migration is already applied in QA. **Alternative considered:** keep columns NOT NULL and require full data at create — rejected; it defeats the savable-draft goal.

### One submit endpoint for first-submit and re-submit

`POST /:id/request-verification` clones `carbonInventories/requestVerification`. `canRequestReductionProjectVerification` changes from DRAFT-only to **DRAFT | REVIEWED** (mirrors CI's `canSubmitToVerification`, which likewise excludes REJECTED). `createReductionProjectSubmission` already reuses the existing submission subject, so the re-submit path needs no new plumbing. **Alternative considered:** a separate re-submit endpoint — rejected as redundant; CI proves one path suffices.

### Two-sided authorization on update (security)

Today `updateReductionProject/route.ts` uses `kind:"organization"` with a body extractor (`request.body.organizationId`), and the service's `validateReductionProjectPrerequisites` re-checks that same body org. **Both layers validate the org the caller names; neither validates the project's current owner** — the minimal select doesn't even fetch `organizationId`. A member of org A can therefore `PATCH` a project owned by org B (sending `body.organizationId = A`) and re-home it (IDs are sequential bigints, enumerable). Fix:

- **Source:** the route moves to `kind:"reductionProject"` (org resolved from `:id`), like `request-verification`/`delete`.
- **Destination:** when `body.organizationId` differs from the project's current org, the service performs a **membership-only** check on the new org (CONTRIBUTOR/ADMIN), not the full `validateReductionProjectPrerequisites` (its accreditation + verified-CI requirements would wrongly block saving an incomplete draft).

`organizationId`/`carbonInventoryId` stay editable — re-parenting is allowed for the authorized; the user owns data consistency, and an incoherent edit simply fails at submit. **Alternatives considered:** (a) drop org/CI from the update contract (simplest, but removes a capability the user wants); (b) keep body-based auth and assert `body.org === project.org` in the service — rejected because the security property would again be split across two layers and could be silently removed by a refactor (which is exactly how the bug arose).

### Update mirrors CI's intent, not its schema shape

CI's update schema is `.partial().strict()` (optional per-field). RP's form submits the whole object, so the RP update schema uses **nullable, always-sent** deferred fields — not `.partial().optional()` (never mix `.optional()` + `.nullable()`). Same "field-edit-only, no submission" intent, different shape. `fileUuids` is removed from create and update entirely; it lives only in the `request-verification` body. The update response becomes `z.null()`.

**Create shares this exact write body** (one `ReductionProjectWriteBodySchema` used by both create and update). Unlike CI — whose `create` is a minimal shell (`usageMode` + org) because a CI is built up across many screens — a reduction project is a **single form**. So `create` must persist whatever the user filled in one request; a 3-field-shell create would silently drop the rest of a fully-filled form on first save. Create is therefore the full nullable-always-sent body, differing from update only in the route (`POST /`, body-org auth, returns `{ id }`) — not the payload.

### Delete uses an atomic conditional `updateMany`, not CI's read-then-write

`DELETE /:id` deliberately diverges from `deleteCarbonInventory`'s read-then-write shape (`findUnique` → check `isCarbonInventoryDeletable` → `update`). Instead the guard is folded directly into a single conditional `updateMany`'s `where`: `status: ACTIVE, submission: { is: null }`. The check-and-write happen as one atomic statement, so there's no window between reading the status and writing the new one for a concurrent request (another delete, a submit) to race through — TOCTOU-free. A project that isn't a deletable DRAFT (already submitted, already reviewed/approved/rejected, already deleted, or nonexistent) simply matches zero rows; `count === 0` throws `ReductionProjectNotDeletableError`. **Alternative considered:** clone CI's read-then-write shape for consistency — rejected; it reintroduces the race CI happens to tolerate, for no simplicity gain.

`submission: { is: null }` checks for the absence of a submission **subject**, not specifically a verification submission — this is equivalent here only because a reduction project's submission subject is always created together with its one `REDUCTION_PROJECT_VERIFICATION` submission (there's no second submission type that could create a subject on its own), so "no submission subject" and "no verification submission" (the condition `calculateReductionProjectDisplayStatus` uses to derive DRAFT) coincide today. The team decided to keep this `updateMany` shortcut rather than align it with `calculateReductionProjectDisplayStatus` explicitly, accepting that the two definitions could silently diverge if a future change ever introduces a second submission type. `deleteReductionProject/integration.test.ts`'s `it.each` over SUBMITTED/REVIEWED/APPROVED/REJECTED asserts the guard rejects deletion for every non-DRAFT status; a dedicated `describe("Regression: submission-subject vs verification-submission DRAFT parity")` block pins the equivalence directly by asserting, on the same fixtures, that `calculateReductionProjectDisplayStatus` (via `GET`) and the delete guard (via `DELETE`) agree on DRAFT-ness — so the suite fails loudly the day that equivalence breaks. Because `requireReductionProjectAccess` filters `status: ACTIVE`, an already-deleted or unknown project also resolves to 403 at the auth layer before the service runs; the web-layer `isReductionProjectDeletable(status)` (DRAFT only) still gates the delete button/action for UX, kept in sync with this server-side invariant.

### Completeness helper is shared and client-computed

`getReductionProjectMissingFields(project)` lives in `@repo/utils` (pure) and is called by both the submit service (server gate — source of truth) and the list actions cell (UX pre-check). The list response exposes the **raw** completeness fields; there is **no** server-computed `missingFields` array (avoids server→client field-name coupling), mirroring `InventoryActionsCell` / `getInventoryMissingFields`.

### Null-guard both mappers

`mapReductionProjectToListItem` guards `totalReduction`; **and** `mapPersistenceFields` (the detail/getById mapper) guards `subcategory`, `baselineScenario`, and `projectScenario`. The detail mapper is a separate function with the same latent crash — omitting it means any DRAFT's detail throws at runtime and fails type-check once the columns are nullable.

## Risks / Trade-offs

- **Reviewer sees live edits on a REVIEWED project (no snapshot)** → Accepted, mirrors CI; admins can only _act_ on PENDING submissions, so no unreviewed state is ever approved. Tracked as a follow-up issue.
- **Re-parenting a REVIEWED project carries its submission history (reviewed under the old org) into the new org** → Not a security issue (it must be re-submitted to progress, and is re-reviewed fresh); acceptable data-lineage oddity under the "user owns consistency" stance.
- **No client dialog for "linked CI not verified" at submit** → Surfaces as the generic error snackbar. Low impact: the create form's CI picker is filtered to `VERIFICATION_APPROVED`, so a draft can only link an already-verified CI; this 422 is reachable only if a CI's verification changes after linking or via a raw API call.
- **Incremental migration (not in-place edit)** → The create-table migration is already applied in QA; editing it in place would break the deployed migration checksum/history, so the nullability change ships as a new incremental migration.
- **Large full-stack surface** → Mitigated by mirroring CI structure to keep review by-analogy, and by landing as two ordered commits on a single branch/PR — API with full integration-test coverage first, then web — rather than splitting into chained PRs.

## Migration Plan

Shipped as a single PR on one branch, landed as two ordered commits (API, then web) rather than chained PRs:

1. **API commit:** add an incremental migration that drops `NOT NULL` on the deferred columns (and sets the `considered_gei` empty-array default); regenerate the Prisma client; land types, utils, the four service changes (create strip, new request-verification, update rewrite + auth, new delete), errors, route registration, mappers; add/extend integration tests.
2. **Web commit:** actions cell (Postular + delete), query hooks, form/screen/hooks, shared dialogs relocation, VOCAB fix, null-safe rendering.
3. **Follow-up:** open the reviewer-visibility (snapshot-on-submit) issue.

No production rollback concern (dev phase, no deployed reduction-project data). If needed, the whole PR is revertible as a unit; internally, the web commit depends on the API commit's contract having landed first.

## Open Questions

Resolved during review (recorded for traceability):

- **Re-parenting is a confirmed capability** (confirmed with the product owner: "if they change the org it's their responsibility"), gated by two-sided auth. The edit form exposes org as an editable picker sourced from `useMyOrganizations` (same source as create); org/CI coherence is validated at submit, not in the form.
- **Update-response convention:** RP update returns `z.null()` here (fixes the current `z.object({})`, matches delete). Unifying CI's update (currently returns the entity) to `z.null()` is deferred to a separate refactor (tasks 11.2) to keep this change one logical unit.
- **Year filter with nullable `year`:** the `?year=` server filter stays literal (a null-year draft does not match a year); the list screen filters client-side, so it drops null when building the year dropdown, and null-year drafts remain visible in the unfiltered view.

No blocking open questions remain.
