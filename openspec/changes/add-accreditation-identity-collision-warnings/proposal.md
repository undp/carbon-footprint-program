## Why

When an admin reviews an organization accreditation submission, there is no way to know whether the applicant's identity fields (legal name, trade name, tax id / RUT) collide with those of another organization — one already accredited or another pending submission. At the platform's target scale (hundreds/thousands of organizations) this is impossible to catch by hand and risks approving duplicated or colliding identities. The problem is compounded by a verified visibility gap: the system only ever exposes each organization's currently-displayed data — which `OrganizationSummaryView` resolves to the pending edit, ranking `PENDING` above `APPROVED` — and never the approved snapshot. So even a detected collision cannot be compared against the officially registered values, in the review dialog or anywhere else.

## What Changes

- **New generic admin endpoint** `GET /admin/submissions/:id/warnings` returning a list of warnings for a submission. Computation dispatches by `submission.type`; the first (and currently only) implementation covers `ORGANIZATION_ACCREDITATION`. Lazy: fetched when the review dialog opens.
- **Identity-collision detection** (field-level, exact, case-insensitive/normalized): compares the applicant submission's `legalName`, `tradeName`, and `taxId` against the **same field** of other organizations (`organizationId` differs), emitting one warning per conflicting organization. Three collision states, covering everything still in the accreditation funnel (a rejected request is not a candidate):
  - `APPROVED` — collision against an accredited organization, compared against that org's **approved snapshot** (not the summary view's displayed/pending row).
  - `PENDING` — collision against another organization's pending submission.
  - `REVIEWED` — collision against another organization's request returned with observations, while that round is still open (it has not been re-submitted or approved since). The organization is expected to correct and re-submit it, so the identity is about to come back.
  - Sedes of the same real company (same field values, different org) are surfaced as awareness signals by design, not suppressed.
- **Warning payload exposes each conflicting org's full identity tuple** (`taxId`, `legalName`, `tradeName`) plus which fields collide and the collision state — surfacing the approved snapshot, which no screen exposes today.
- **Generic `Warning` shape** — an intentionally generic bag `{ type, metadata }` so future submission types can add their own warning kinds without changing the contract. Structure only: the Spanish summary is composed by the web client from `metadata`, keeping the wording (and `VOCAB`) in one place.
- **Web — review dialog:** new "Conflictos detectados" section in `ViewSubmissionDialog`, shown only for organization-accreditation submissions that have warnings. One numbered collapsible per conflict ("Conflicto N", accredited collisions first), expanding to a side-by-side comparison of the applicant vs. the conflicting org: each side's submission status, each side's organization standing (Inscrita / No Inscrita), and the three identity fields with the colliding cell highlighted.
- **Web — organizations grid (standalone prep):** the `/admin/organizations` grid swaps the "Sub-Rubro" column for a "RUT" column and adds `taxId` to its fuzzy search, so admins can view and search by RUT. Requires adding `taxId` to the admin organizations list response.

**Non-goals (explicitly out of scope):**

- Navigating from a warning to a filtered `/admin/organizations` view (query-param / DataGrid `isAnyOf` filter). The grid also reads the summary view, so it cannot show the approved snapshot either — the comparison lives inline instead.
- Display-name-only collision detection (`COALESCE(tradeName, legalName, taxId)`) — rejected because it misses legal-name collisions.
- Fuzzy / trigram / `pg_trgm` matching — matching is exact.
- No database migration and no new DB constraint (e.g. RUT uniqueness) in this change.

## Capabilities

### New Capabilities

- `submission-warnings`: an admin-only endpoint that returns a list of typed warnings for a given submission, dispatched by submission type; and, for organization-accreditation submissions, field-level identity-collision detection (against approved and pending organizations, exposing the approved snapshot) surfaced as an inline comparison in the review dialog.

### Modified Capabilities

<!-- None. The /admin/organizations grid has no governing spec today; the RUT column swap and the taxId list-response addition are implementation-level changes captured in Impact and tasks (Phase 0). -->

## Impact

- **API** — new feature `apps/api/src/features/submissions/getSubmissionWarnings/` (route → handler → service, plus `organizationIdentityCollision.ts` holding the per-type logic), admin auth (ADMIN/SUPERADMIN). Reuses the existing accredited-org detection (`accredited_organizations_ids` CTE / `hasApprovedOrganizationData`) and joins to the `APPROVED`/`APPROVED_AUTOMATICALLY` submission's `OrganizationData` to read the approved snapshot values. New Zod schemas under `packages/types/src/submissions/`. Adds `taxId` to `AdminOrganizationItemSchema` and the admin organizations mapper (`taxId` is already selected in the include — no query change, no migration).
- **Web** — `ViewSubmissionDialog` gains a conflicts section + a comparison sub-component + a `useGetSubmissionWarnings` query hook; `useOrganizationColumns` swaps the column; `OrganizationScreenTable` adds `taxId` to Fuse keys.
- **Data** — no schema migration. The approved snapshot is reachable via existing relations; `taxId` is already stored and selected.
- **Tests** — API integration tests for the warnings endpoint (no collision, approved collision, pending collision, self-exclusion, multiple conflicts, null fields).
- **UI language** — all new user-facing strings in Spanish (no i18n), consistent with the app, and all composed in the web app. Vocabulary follows `VOCAB` ("organización", "inscrita"); the API returns no prose.
- **User-visible copy change (call out in review)** — the tax-id label is centralized in `@repo/constants` (`TAX_ID_LABEL` / `TAX_ID_LABEL_SHORT`) because it is per-country wording for a generic identifier. Two pre-existing labels change text as a result: the review dialog's "RUT / Tax ID" and My Organization's "RUT / RUC" both become "RUT / RUC / ID Tributario" (already the wording used by the organization form and the form-fields endpoint). No test asserted the replaced strings.
