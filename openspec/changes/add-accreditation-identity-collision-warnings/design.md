## Context

Organization accreditation requests are `Submission` rows of type `ORGANIZATION_ACCREDITATION` whose subject links to an `OrganizationData` snapshot (`legalName`, `tradeName`, `taxId`). Admins review them through `ViewSubmissionDialog`, backed by `GET submissions/organization/:id/history`.

Two facts from the codebase drive this design:

1. **"Accredited" is a derived concept.** `OrganizationData.status` is only `ACTIVE | OUTDATED`. Whether an org is accredited is computed from its linked submission status (`APPROVED` / `APPROVED_AUTOMATICALLY`), already materialized in `OrganizationSummaryView.is_accredited` and the `accredited_organizations_ids` CTE, and checked by `hasApprovedOrganizationData()`.
2. **Only the displayed (pending) snapshot is ever exposed.** When an accredited org edits its data, a new `PENDING` `OrganizationData` (v2) is created and the approved one (v1) is kept. `OrganizationSummaryView` ranks `PENDING` above `APPROVED`, so every admin surface (review dialog, org detail, org grid) shows v2. The approved v1 values are reachable via relations but surfaced nowhere. This is why a "navigate to the grid to compare" approach fails: the grid can't show v1 either.

## Goals / Non-Goals

**Goals:**

- Detect identity collisions (legal name, trade name, RUT) between an accreditation applicant and other organizations — both accredited and pending — when the admin reviews the submission.
- Let the admin compare the applicant against each conflicting organization's real identity values, including the approved snapshot, without leaving the dialog.
- Keep the warning mechanism generic so future submission types can add their own warnings.
- Ship an independent grid improvement: view/search by RUT in `/admin/organizations`.

**Non-Goals:**

- Navigating to a filtered organizations grid (query-param / DataGrid `isAnyOf`). Dead end for the visibility gap; also `isAnyOf` on a string column with a scalar seeded value crashes in `@mui/x-data-grid` — avoided entirely.
- Display-name-only detection (`COALESCE(tradeName, legalName, taxId)`) — misses legal-name collisions.
- Fuzzy / trigram (`pg_trgm`) matching — matching is exact.
- Database migration, RUT uniqueness constraint, or backfill.

## Decisions

### D1 — Dedicated generic endpoint `GET /admin/submissions/:id/warnings`

Keyed by submission id, dispatched internally by `submission.type`. **Alternative rejected:** folding a `warnings` field into `GET submissions/organization/:id/history`. That response is a bare array shared by three history types; adding warnings would force a wrapper and branch the shared `useViewSubmission` hook, and the history endpoint is org-scoped (`canAdminsBypass`) so warnings would leak to org users. A dedicated `/admin/...` route gives clean ADMIN/SUPERADMIN authorization, an isolated query, and room for future submission types.

### D2 — Generic `Warning` bag `{ type, message, metadata }`

`metadata` typed as a free-form object (Zod `z.record`/`unknown`); the frontend defines a small per-`type` parser/guard at the render site to recover type-safety. **Alternative rejected:** a Zod `discriminatedUnion` on `type` (compile-time safety end to end). The bag was chosen deliberately to maximize back/front decoupling and future extensibility; the render-site guard keeps the UI safe where it matters.

### D3 — Field-level exact detection (not display-name, not fuzzy)

Compare `legalName↔legalName`, `tradeName↔tradeName`, `taxId↔taxId`, exact, case-insensitive, trimmed, against other organizations (`organizationId` differs), excluding the applicant's own org. **Alternatives rejected:** (a) display-name-only — misses `legalName` collisions such as "Inventures SpA" when trade names differ; (b) fuzzy/trigram — needs `pg_trgm` + GIN index + raw SQL, none of which exist, and the matching requirement is exact. Sedes of the same company (matching values, different org) are **surfaced as awareness signals**, not suppressed — an admin approving a new branch should see the others.

### D4 — Compare accredited orgs against their APPROVED snapshot

For `APPROVED` collisions, read the `OrganizationData` linked to the org's `APPROVED`/`APPROVED_AUTOMATICALLY` submission — not `OrganizationSummaryView` (which yields the pending v2). Reuse the `accredited_organizations_ids` logic / `hasApprovedOrganizationData` join. This is what closes the visibility gap and prevents missing a collision that lives in v1 but not v2. Pending collisions compare against the other org's pending data.

### D5 — Inline comparison in the review dialog (hybrid chips → expand)

Both sides of the comparison come from the warning payload (`metadata.applicant` + the conflicting tuple). The applicant column is **not** rebuilt from the submission-history response: that one carries the organization's displayed snapshot (the summary view ranks `PENDING` above `APPROVED`, and the same tuple is attached to every timeline entry), so reading it here would let the dialog highlight two values that never matched.

A "Conflictos detectados" amber section between `CurrentStatusBanner` and `OrgDataSection`, whose subtitle says outright that the information is referential and the request can be approved anyway — the section informs a decision, it does not gate it. Collapsed: one numbered row per conflicting org ("Conflicto N" · inscribed / not inscribed · tax id · legal name), flat and in the endpoint's order. Expanded: a side-by-side grid (applicant vs that org) with the three identity rows plus the status of each side's submission, the colliding cells highlighted. **Alternatives considered:** a minimal chips + `OrgDataSection` re-use (less guided comparison), and an always-visible full matrix (clearest but heavy for the common single-conflict case). Hybrid is compact by default and rich on demand, and scales from 1 to N conflicts.

Two facts must not be squeezed into one chip: whether the conflicting **organization** is inscribed, and the status of the **submission** whose snapshot matched. The collapsed row carries the first (through the app-wide organization status chip, so an inscribed organization looks inscribed here too) and the comparison carries the second. Grouping headers per collision state were dropped in favour of the numbering: with the two facts separated, a state-based grouping was describing something the chips no longer said.

### D6 — RUT column swap kept as standalone prep

Swap the grid's "Sub-Rubro" column for "RUT" and add `taxId` to Fuse keys; add `taxId` to `AdminOrganizationItemSchema` + admin mapper (`taxId` is already selected in the include — no query change, no migration). Justified on its own merit (admin can view/search by RUT), independent of the (dropped) navigation feature. No `filterModel`/`isAnyOf` involved.

### D7 — Keep both collisions per organization (no dedup, for now)

Detection matches the applicant against each other org's approved snapshot (if accredited) and pending snapshot (if it has a pending submission). If the **same** organization matches on both, emit **two** warnings — one with `collisionState = APPROVED` and one with `PENDING` — rather than collapsing them. Warnings are still ordered `APPROVED` before `PENDING`, and candidates are read `id desc` so both the within-state order and the representative snapshot of an org with several matching `ACTIVE` rows (the most recent one) are deterministic across requests. Rationale (chosen for now): keep the full picture visible — the org is both officially registered with the colliding value and has a pending edit that also collides — and avoid any merge/union logic. Revisit later if the duplication proves noisy. (Resolves former open question on dedup.)

### D8 — Generic, multi-country normalization for matching (no RUT-specific logic)

`taxId` is intentionally a generic string field — labeled by the shared `TAX_ID_LABEL` constant ("RUT / RUC / ID Tributario") — because the platform is a Latin-America-wide good; there is **no** RUT formatter/validator/verifier-digit logic anywhere in the codebase, and none should be added here. Matching therefore normalizes generically: **trim + case-insensitive** equality applied uniformly to `legalName`, `tradeName`, and `taxId`; null (and whitespace-only) fields are skipped. Chile-specific RUT normalization (stripping dots/hyphen, verifier-digit handling) is explicitly NOT done.

Because values are stored verbatim (nothing trims on write), the normalization must apply to **both** sides. A Prisma `equals` filter can only normalize the applicant's value, so the query uses a deliberately **loose prefilter** (`contains`, case-insensitive) and the exact, trimmed, field-to-same-field equality is decided in memory over the candidate rows — the "over the candidate set" option below, without raw SQL. Loose in SQL, exact in memory: padding no longer produces false negatives, and substring matches are dropped before a warning is built.

**Known limitation:** the same real tax id entered in different formats (`"76.123.456-7"` vs `"761234567"`) still will not match. Closing that gap would need a **generic** separator-stripping helper in `packages/utils` applied over the same candidate set — deferred until false-negatives are observed, and kept format-agnostic (never Chile-only). (Resolves former open question on normalization.)

### D9 — Spanish message copy (server-built summary)

The generic bag's `message` is a one-line Spanish summary; the chip and comparison carry the structured tuple. Field labels: `legalName`→"razón social", `tradeName`→"nombre comercial", `taxId`→`TAX_ID_LABEL_SHORT`. The sentence names the colliding **postulation** first and then the organization behind it, and the organization clause branches on `organizationIsAccredited` — never on the collision state, since a pending collision most often comes from an organization that is not inscribed yet:

- `Coincide con {postulación} de {organización} en {campos}.`
- `{postulación}`: `la postulación aprobada` (`APPROVED`) / `la postulación pendiente` (`PENDING`).
- `{organización}`: `la organización inscrita ({identidad})` when `organizationIsAccredited`, otherwise `una organización no inscrita ({identidad})`.
- `{identidad}`: `RUT {taxId}`, falling back to `«{legalName}»` when the conflicting org has no `taxId`.
- `{campos}` joins the colliding field labels with "y" (e.g. "razón social y nombre comercial").

Wording follows `VOCAB`: "organización", never "empresa". (Resolves former open question on copy.)

## Risks / Trade-offs

- **Generic bag loses compile-time safety on `metadata`.** → Frontend defines a per-`type` Zod parser/guard at the render boundary; unknown/malformed metadata degrades gracefully (chip without expansion) rather than crashing.
- **Field-level exact flags legitimate sedes as collisions.** → Accepted by design as awareness; the Spanish `message` adapts wording so a shared-name case reads as context, not error.
- **Exact matching on non-indexed text columns is a sequential scan.** → Acceptable: the query is per-submission, lazy, admin-only, over the accredited/pending subset. Add a functional index (`lower(...)`) later only if it becomes hot.
- **`taxId` is nullable and not unique.** → Null fields are skipped in matching (no false match on empty). Pre-existing duplicate RUTs will surface as collisions — a desired side effect that exposes dirty data.
- **Exposing the approved snapshot is a new data path.** → Strictly behind ADMIN/SUPERADMIN auth on the dedicated endpoint; not added to any org-scoped response.
- **An org that is both accredited and has a pending edit may appear twice** (one `APPROVED` + one `PENDING` warning). Intended per **D7** (keep both, for now): the minor duplication buys a complete picture and simpler logic. → Revisit dedup if it proves noisy in practice.

## Open Questions

All previously open questions are resolved:

- **Dedup** (accredited + pending-editing same org) → **D7**: keep both warnings (one `APPROVED`, one `PENDING`); no collapse, for now.
- **Spanish copy** → **D9**: server-built summary templates (final wording UI-tunable at implementation).
- **`taxId` normalization** → **D8**: generic trim + case-insensitive (no Chile-specific RUT logic); cross-format matching deferred as a generic helper.

No blocking unknowns remain.
