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

### D2 — Generic `Warning` bag `{ type, metadata }`

`metadata` typed as a free-form object (Zod `z.record`/`unknown`); the frontend defines a small per-`type` parser/guard at the render site to recover type-safety. **Alternative rejected:** a Zod `discriminatedUnion` on `type` (compile-time safety end to end). The bag was chosen deliberately to maximize back/front decoupling and future extensibility; the render-site guard keeps the UI safe where it matters. `type` itself is **not** free-form — it is `z.enum(WarningType)` over the registry of kinds, so the loose part of the contract is confined to `metadata`. The runtime guard still checks `type`, because a newer API can send a kind the deployed front does not know.

The bag carries **structure only, no prose** (see D9): user-facing copy is composed by the client.

### D3 — Field-level exact detection (not display-name, not fuzzy)

Compare `legalName↔legalName`, `tradeName↔tradeName`, `taxId↔taxId`, exact, case-insensitive, trimmed, against other organizations (`organizationId` differs), excluding the applicant's own org. **Alternatives rejected:** (a) display-name-only — misses `legalName` collisions such as "Inventures SpA" when trade names differ; (b) fuzzy/trigram — needs `pg_trgm` + GIN index + raw SQL, none of which exist, and the matching requirement is exact. Sedes of the same company (matching values, different org) are **surfaced as awareness signals**, not suppressed — an admin approving a new branch should see the others.

### D4 — Compare accredited orgs against their APPROVED snapshot

For `APPROVED` collisions, read the `OrganizationData` linked to the org's `APPROVED`/`APPROVED_AUTOMATICALLY` submission — not `OrganizationSummaryView` (which yields the pending v2). Reuse the `accredited_organizations_ids` logic / `hasApprovedOrganizationData` join. This is what closes the visibility gap and prevents missing a collision that lives in v1 but not v2. Pending collisions compare against the other org's pending data.

### D5 — Inline comparison in the review dialog (hybrid chips → expand)

Both sides of the comparison come from the warning payload (`metadata.applicant` + the conflicting tuple). The applicant column is **not** rebuilt from the submission-history response: that one carries the organization's displayed snapshot (the summary view ranks `PENDING` above `APPROVED`, and the same tuple is attached to every timeline entry), so reading it here would let the dialog highlight two values that never matched.

A "Conflictos detectados" amber section between `CurrentStatusBanner` and `OrgDataSection`, whose subtitle says outright that the information is referential and the request can be approved anyway — the section informs a decision, it does not gate it. Collapsed: one numbered row per conflicting org ("Conflicto N" only), flat and in the endpoint's order. Expanded: a side-by-side grid (applicant vs that org) with the two status rows first and the three identity rows below, the colliding cells highlighted. **Alternatives considered:** a minimal chips + `OrgDataSection` re-use (less guided comparison), and an always-visible full matrix (clearest but heavy for the common single-conflict case). Hybrid is compact by default and rich on demand, and scales from 1 to N conflicts.

Two facts must not be squeezed into one value: whether an **organization** is inscribed, and the status of the **submission** whose snapshot matched. The comparison grid reports both, as its first two rows — "Estado de la postulación" then "Estado de la organización" (the app-wide organization status chip, so an inscribed organization looks inscribed here too) — for the applicant and the conflicting org alike; each side's standing comes from `metadata.organizationStatus` / `metadata.applicant.organizationStatus`, since a pending submission may well belong to an already-inscribed organization. That standing is the summary view's `display_status`, NOT its `is_accredited` flag: the flag is blind to BLOCKED, so a blocked organization — which keeps its approved snapshot and therefore still collides — would have read "Inscrita". The three-value standing feeds the app-wide chip config directly, and the Spanish clause is exhaustive over it. The collapsed row keeps nothing but the numbering, so there is a single place to read a conflict instead of a header that half-repeats the grid. Grouping headers per collision state were dropped in favour of the numbering: with the two facts separated, a state-based grouping was describing something the chips no longer said.

### D6 — RUT column swap kept as standalone prep

Swap the grid's "Sub-Rubro" column for "RUT" and add `taxId` to Fuse keys; add `taxId` to `AdminOrganizationItemSchema` + admin mapper (`taxId` is already selected in the include — no query change, no migration). Justified on its own merit (admin can view/search by RUT), independent of the (dropped) navigation feature. No `filterModel`/`isAnyOf` involved.

### D7 — Keep both collisions per organization, and never merge snapshots

Detection matches the applicant against each other org's approved snapshot (if accredited) and pending snapshot (if it has a pending submission). If the **same** organization matches on both, emit **two** warnings — one with `collisionState = APPROVED` and one with `PENDING` — rather than collapsing them. Warnings are ordered `APPROVED` before `PENDING`. Rationale: keep the full picture visible — the org is both officially registered with the colliding value and has a pending edit that also collides. (Resolves former open question on dedup.)

**Every warning reports exactly one real snapshot.** An org can hold several `ACTIVE` snapshots _within_ one state, because approving never marks the prior approved snapshot OUTDATED. The invariant that matters is _"a highlighted `collisionField` shows two equal values"_, and it constrains how those snapshots may be combined: they may not. Within an org and state, a snapshot is reported only when its colliding fields are **not covered** by another reported snapshot's — maximal collision sets survive, dominated and duplicated ones collapse, and snapshots colliding on disjoint fields each keep their own warning. Candidates are read `id desc` and the reduction sorts by completeness with a stable sort, so between equally complete snapshots the newest survives and the order is deterministic across requests.

**Alternative rejected:** unioning the colliding fields across an org's snapshots and showing the newest tuple. It reports a field as matching while displaying the newest snapshot's value for it — with v1 `{Foo, 111}` and v2 `{Foo, 222}` both ACTIVE+APPROVED and an applicant `{Foo, 111}`, `taxId` entered the union through v1 while the tuple came from v2, so the grid highlighted a "match" reading 111 against 222 and the summary cited a tax id the applicant does not share. A misleading comparison is the one failure this feature exists to prevent.

### D8 — Generic, multi-country normalization for matching (no RUT-specific logic)

`taxId` is intentionally a generic string field — labeled by the shared `TAX_ID_LABEL` constant ("RUT / RUC / ID Tributario") — because the platform is a Latin-America-wide good; there is **no** RUT formatter/validator/verifier-digit logic anywhere in the codebase, and none should be added here. Matching therefore normalizes generically: **trim + case-insensitive** equality applied uniformly to `legalName`, `tradeName`, and `taxId`; null (and whitespace-only) fields are skipped. Chile-specific RUT normalization (stripping dots/hyphen, verifier-digit handling) is explicitly NOT done.

Normalization must hold on **both** sides, and it is enforced where the value enters the system: `OrganizationMutationDataSchema` `.trim()`s every free-text field, so `OrganizationData` never stores a padded value. With both sides already whitespace-free, the query filters on case-insensitive `equals` (indexable, no wildcards) and the in-memory comparison decides **which** fields collided.

**Alternative rejected:** a loose `contains` prefilter to rescue padded rows, with exact equality decided in memory. It compiles to an unindexable `ILIKE '%value%'` that returns every row sharing a substring — the whole table for a one-character name — and Prisma does not escape LIKE metacharacters, so a `%` in the applicant's value matched everything. Trimming at the write contract removes the reason it existed and fixes the dirty data at the source for the rest of the app. **Residual limitation:** rows written outside the contract (seeds, scripts, direct SQL) must trim at their own source.

**Known limitation:** the same real tax id entered in different formats (`"76.123.456-7"` vs `"761234567"`) still will not match. Closing that gap would need a **generic** separator-stripping helper in `packages/utils` applied over the same candidate set — deferred until false-negatives are observed, and kept format-agnostic (never Chile-only). (Resolves former open question on normalization.)

### D9 — Spanish copy composed by the client

The API sends **structure only**; the one-line Spanish summary is built on the front (`collisionCopy.ts`) from `metadata`, and the comparison grid renders the structured tuple. **Alternative rejected:** a server-built `message` field in the bag. The vocabulary lives in `VOCAB` (`apps/web/src/config/vocab.ts`), which the API cannot import, so a server-built sentence duplicates "organización" / "inscrita" and drifts the day a term changes. Composing on the client also keeps the three field labels single-sourced: the message uses them in prose form and the comparison grid `upperFirst`s the same record for its row labels.

Field labels: `legalName`→"razón social", `tradeName`→"nombre comercial", `taxId`→`TAX_ID_LABEL_SHORT`. The colliding fields are listed in the order the API sends them (the API owns that ordering). The sentence names the colliding **postulation** first and then the organization behind it, and the organization clause branches on `organizationStatus` — never on the collision state, since a pending collision most often comes from an organization that is not inscribed yet and an approved-snapshot collision may belong to a blocked one:

- `Coincide con {postulación} de {organización} en {campos}.`
- `{postulación}`: `la postulación aprobada` (`APPROVED`) / `la postulación pendiente` (`PENDING`).
- `{organización}`: `la organización inscrita ({identidad})` (`ACCREDITED`), `una organización no inscrita ({identidad})` (`NOT_ACCREDITED`) or `una organización bloqueada ({identidad})` (`BLOCKED`) — exhaustive over the standing.
- `{identidad}`: `RUT {taxId}`, falling back to `«{legalName}»` when the conflicting org has no `taxId`.
- `{campos}` joins the colliding field labels with "y" (e.g. "razón social y nombre comercial").

Wording follows `VOCAB`: "organización", never "empresa". (Resolves former open question on copy.)

## Risks / Trade-offs

- **Generic bag loses compile-time safety on `metadata`.** → Frontend defines a per-`type` Zod parser/guard at the render boundary; unknown/malformed metadata degrades gracefully (chip without expansion) rather than crashing.
- **Field-level exact flags legitimate sedes as collisions.** → Accepted by design as awareness; the Spanish `message` adapts wording so a shared-name case reads as context, not error.
- **Exact matching on non-indexed text columns is a sequential scan.** → Acceptable: the query is per-submission, lazy, admin-only, over the accredited/pending subset. Add a functional index (`lower(...)`) later only if it becomes hot.
- **`taxId` is nullable and not unique.** → Null fields are skipped in matching (no false match on empty). Pre-existing duplicate RUTs will surface as collisions — a desired side effect that exposes dirty data.
- **Exposing the approved snapshot is a new data path.** → Strictly behind ADMIN/SUPERADMIN auth on the dedicated endpoint; not added to any org-scoped response.
- **An org may appear in more than one warning** — one per state it collides in (`APPROVED` + `PENDING`), and one per snapshot within a state whose colliding fields no other reported snapshot covers. Intended per **D7**: each warning stays internally consistent, which merging cannot guarantee. → Revisit dedup if it proves noisy in practice.

## Open Questions

All previously open questions are resolved:

- **Dedup** (accredited + pending-editing same org) → **D7**: keep both warnings (one `APPROVED`, one `PENDING`); no collapse. Snapshots within a state are never merged either — only dominated ones collapse.
- **Spanish copy** → **D9**: server-built summary templates (final wording UI-tunable at implementation).
- **`taxId` normalization** → **D8**: generic trim + case-insensitive (no Chile-specific RUT logic); cross-format matching deferred as a generic helper.

No blocking unknowns remain.
