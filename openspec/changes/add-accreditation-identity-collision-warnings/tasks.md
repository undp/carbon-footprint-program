## 1. Phase 0 — RUT column in admin organizations grid (standalone)

- [x] 1.1 Add `taxId: z.string().nullable()` to `AdminOrganizationItemSchema` (`packages/types/src/organizations/admin/getAllOrganizations/schemas.ts`)
- [x] 1.2 Add `taxId: org.organizationData.taxId ?? null` to `mapAdminOrganizationSummaryToResponse` (`apps/api/src/features/organizations/admin/mappers.ts`) — `taxId` is already selected in `adminOrganizationSummaryViewInclude`, no include/query change
- [x] 1.3 In `apps/web/src/screens/Maintainer/hooks/useOrganizationColumns.tsx`, remove the `subsectorName` ("Sub-Rubro") column and add a `taxId` column with `valueFormatter: (v) => v ?? "-"`, headed by the shared `TAX_ID_LABEL_SHORT` constant
- [x] 1.6 Add `TAX_ID_LABEL` / `TAX_ID_LABEL_SHORT` to `packages/constants` (per-deployment wording for a generic tax id) and point every tax-id label at them — the grid header, the review-dialog rows, the org profile/form labels and the API form-fields endpoint previously spelled it four different ways
- [x] 1.4 Add `taxId` to the Fuse `fuseOptions.keys` in `apps/web/src/screens/Maintainer/components/OrganizationScreenTable.tsx` so the search box matches RUT
- [x] 1.5 Verify no `filterModel`/`isAnyOf` is introduced; run `pnpm type-check` and confirm the grid renders with the RUT column and RUT search works

## 2. Phase 1 — API: submission warnings endpoint + collision detection

- [x] 2.1 Add Zod schemas under `packages/types/src/submissions/getSubmissionWarnings/`: `GetSubmissionWarningsParamsSchema` (`{ id }`), the generic `WarningSchema` (`{ type: z.enum(WarningType), metadata: z.record(z.string(), z.unknown()) }` — structure only, no prose), and `GetSubmissionWarningsResponseSchema = z.array(WarningSchema)`; export the response-derived type
- [x] 2.2 Define the collision warning `type` constant (`ORGANIZATION_IDENTITY_COLLISION`) and a typed metadata shape (for internal construction) with `collisionState`, `organizationId`, `taxId`, `legalName`, `tradeName`, `collisionFields`
- [x] 2.3 Create the feature `apps/api/src/features/submissions/getSubmissionWarnings/` with `route.ts` (`GET /submissions/:id/warnings` under the admin router, ADMIN/SUPERADMIN), `handler.ts`, `service.ts` (generic dispatch only) and `organizationIdentityCollision.ts` (all organization-specific logic, so a future warning kind gets its own sibling file instead of growing one `helpers.ts`)
- [x] 2.4 In the service, load the submission by id; dispatch by `submission.type`; return `[]` for types without warning logic
- [x] 2.5 Implement accreditation collision detection: read the applicant submission's `OrganizationData` (`legalName`, `tradeName`, `taxId`); query other organizations' matching field values, excluding the applicant's own `organizationId`; exact, case-insensitive matching (Prisma `equals` + `mode: "insensitive"`) applied uniformly to the three fields, skipping null fields. Trimming is enforced at the write contract (`OrganizationMutationDataSchema.trim()`), NOT with a `contains` prefilter — see design D8. Normalization is GENERIC (multi-country) — do NOT add Chile-specific RUT logic (no dots/hyphen stripping, no verifier digit); cross-format taxId matching is a documented deferred limitation
- [x] 2.6 Implement the `APPROVED` branch: match against each accredited org's **approved** `OrganizationData` (reuse `accredited_organizations_ids` / `hasApprovedOrganizationData` join to `APPROVED`/`APPROVED_AUTOMATICALLY` submissions), not `OrganizationSummaryView`
- [x] 2.7 Implement the `PENDING` branch: match against other organizations' pending submission data
- [x] 2.8 Build one warning per colliding SNAPSHOT (per design D7): an org that matches on both its approved and pending snapshots yields two separate warnings (one `APPROVED`, one `PENDING`), not merged; within a state, never union fields across snapshots — report only snapshots whose colliding fields no other reported snapshot covers, so a highlighted field always shows two equal values; order `APPROVED` before `PENDING`
- [x] 2.9 Keep the API free of prose — no `message` field. The Spanish summary is composed on the web from `metadata` (task 3.8), per design D9
- [x] 2.10 Register the route in the admin submissions router; wire response schema `200` + `ApiErrorResponseSchema`; run `pnpm type-check` and `pnpm lint`

## 3. Phase 2 — Web: "Conflictos detectados" section (chips grouped by state)

- [x] 3.1 Add a `useGetSubmissionWarnings(submissionId)` query hook (`apps/web/src/api/query/submissions/`), lazy (`enabled: !!submissionId`), calling `admin/submissions/${id}/warnings`. Its query key carries `SubmissionQueryKey.SubmissionUpdateDependency` like its siblings, so approving/rejecting/reviewing any submission invalidates the warnings (they report other submissions' status and their organizations' standing)
- [x] 3.2 Add a per-`type` metadata parser/guard for `ORGANIZATION_IDENTITY_COLLISION` (small Zod schema at the render boundary) to safely read `metadata`
- [x] 3.3 Create the `ConflictsSection` component under `apps/web/src/components/dialogs/SubmissionHistory/`: render only when `isOrganizationAccreditation && warnings.length`; amber attention styling consistent with existing patterns; group by state (accredited first, then pending)
- [x] 3.4 Render one numbered collapsed row per conflicting org, carrying the numbering only ("Conflicto N") so every fact is read in one place — the comparison grid. No per-state grouping headers
- [x] 3.7 Subtitle of the section states explicitly that the conflicts are referential and the request can be approved anyway
- [x] 3.8 Compose the Spanish summary on the web (`collisionCopy.ts`) from `metadata`, using `VOCAB` ("organización", "inscrita") and the D9 templates: name the postulation, then the organization (branching on `organizationStatus` (exhaustive: inscrita / no inscrita / bloqueada), never on the collision state); join fields with "y"; fall back to `«legalName»` when taxId is null. The field labels are the single source shared with the comparison grid (which `upperFirst`s them)
- [x] 3.5 Insert `ConflictsSection` in `ViewSubmissionDialog.tsx` between `CurrentStatusBanner` and `OrgDataSection`; pass the current submission's id/warnings
- [x] 3.6 Run `pnpm type-check` and `pnpm lint`

## 4. Phase 3 — Web: expand to side-by-side comparison

- [x] 4.1 Build the comparison sub-component: on expand, show a side-by-side grid of applicant vs conflicting org, leading with an "Estado de la postulación" row (each side's submission status) and an "Estado de la organización" row (each side's standing through `<StatusChip>` + the app-wide `ORGANIZATION_DISPLAY_STATUS_CONFIG`, Inscrita / No Inscrita), followed by `tradeName`, `legalName`, `taxId`; one separator per row and generous cell padding so it reads as a grid
- [x] 4.2 Highlight the colliding cell(s) using theme colors (driven by `collisionFields`)
- [x] 4.3 Ensure the layout scales from 1 to N conflicts (per-chip expansion, no horizontal overflow of the dialog)
- [x] 4.4 Run `pnpm type-check` and `pnpm lint`

## 5. Tests

- [x] 5.1 API integration tests for `GET /admin/submissions/:id/warnings`: no collision → empty; legal-name collision with accredited org → `APPROVED` warning; trade-name collision with pending submission → `PENDING` warning; taxId collision; self-exclusion; approved-snapshot-not-displayed-row; multiple conflicts → one warning each; non-admin → forbidden; unknown id → not found; non-accreditation type → empty
- [x] 5.2 API integration tests for the normalization/payload contract: null identity fields never match each other; the conflicting org's `taxId`/`legalName` are exposed so the client can fall back to `«legalName»`; `OUTDATED` organization data ignored; the payload carries no `message`; `metadata.applicant` equals the compared snapshot
- [x] 5.3 Web unit tests (`pnpm test:web`, co-located `*.test.ts`) for `parseCollisionWarnings` (valid / unknown type / malformed metadata / ordering preserved) and for `collisionCopy` (`COLLISION_FIELD_LABELS` exhaustive over `CollisionField`; every `buildCollisionMessage` branch verbatim — approved/pending, inscribed/not, `«legalName»` fallback, one/two/three fields)
- [x] 5.4 API integration tests for the write contract (`createOrganization`): every free-text field stored trimmed; whitespace-only `legalName` rejected as empty
- [x] 5.5 API integration regression tests for the one-snapshot-per-warning rule: an org with two `ACTIVE` approved snapshots colliding on nested field sets reports the maximal one with its own tuple; two snapshots colliding on disjoint fields report one warning each; every reported `collisionField` holds equal values on both sides

## 6. Finalize

- [x] 6.1 Run `pnpm format && pnpm lint && pnpm type-check`
- [ ] 6.2 Update any affected docs; open PR (English title/description per convention), UI strings in Spanish
