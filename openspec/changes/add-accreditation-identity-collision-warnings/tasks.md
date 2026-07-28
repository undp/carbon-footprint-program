## 1. Phase 0 — RUT column in admin organizations grid (standalone)

- [x] 1.1 Add `taxId: z.string().nullable()` to `AdminOrganizationItemSchema` (`packages/types/src/organizations/admin/getAllOrganizations/schemas.ts`)
- [x] 1.2 Add `taxId: org.organizationData.taxId ?? null` to `mapAdminOrganizationSummaryToResponse` (`apps/api/src/features/organizations/admin/mappers.ts`) — `taxId` is already selected in `adminOrganizationSummaryViewInclude`, no include/query change
- [x] 1.3 In `apps/web/src/screens/Maintainer/hooks/useOrganizationColumns.tsx`, remove the `subsectorName` ("Sub-Rubro") column and add a `taxId` column with `valueFormatter: (v) => v ?? "-"`, headed by the shared `TAX_ID_LABEL_SHORT` constant
- [x] 1.6 Add `TAX_ID_LABEL` / `TAX_ID_LABEL_SHORT` to `packages/constants` (per-deployment wording for a generic tax id) and point every tax-id label at them — the grid header, the review-dialog rows, the org profile/form labels and the API form-fields endpoint previously spelled it four different ways
- [x] 1.4 Add `taxId` to the Fuse `fuseOptions.keys` in `apps/web/src/screens/Maintainer/components/OrganizationScreenTable.tsx` so the search box matches RUT
- [x] 1.5 Verify no `filterModel`/`isAnyOf` is introduced; run `pnpm type-check` and confirm the grid renders with the RUT column and RUT search works

## 2. Phase 1 — API: submission warnings endpoint + collision detection

- [x] 2.1 Add Zod schemas under `packages/types/src/submissions/getSubmissionWarnings/`: `GetSubmissionWarningsParamsSchema` (`{ id }`), the generic `WarningSchema` (`{ type: string, message: string, metadata: z.record(z.string(), z.unknown()) }` or equivalent free-form object), and `GetSubmissionWarningsResponseSchema = z.array(WarningSchema)`; export the response-derived type
- [x] 2.2 Define the collision warning `type` constant (`ORGANIZATION_IDENTITY_COLLISION`) and a typed metadata shape (for internal construction) with `collisionState`, `organizationId`, `taxId`, `legalName`, `tradeName`, `collisionFields`
- [x] 2.3 Create the feature `apps/api/src/features/submissions/getSubmissionWarnings/` with `route.ts` (`GET /submissions/:id/warnings` under the admin router, ADMIN/SUPERADMIN), `handler.ts`, `service.ts` (generic dispatch only) and `organizationIdentityCollision.ts` (all organization-specific logic, so a future warning kind gets its own sibling file instead of growing one `helpers.ts`)
- [x] 2.4 In the service, load the submission by id; dispatch by `submission.type`; return `[]` for types without warning logic
- [x] 2.5 Implement accreditation collision detection: read the applicant submission's `OrganizationData` (`legalName`, `tradeName`, `taxId`); query other organizations' matching field values, excluding the applicant's own `organizationId`; exact, case-insensitive, trimmed matching (Prisma `mode: "insensitive"`) applied uniformly to the three fields, skipping null fields. Normalization is GENERIC (multi-country) — do NOT add Chile-specific RUT logic (no dots/hyphen stripping, no verifier digit) per design D8; cross-format taxId matching is a documented deferred limitation
- [x] 2.6 Implement the `APPROVED` branch: match against each accredited org's **approved** `OrganizationData` (reuse `accredited_organizations_ids` / `hasApprovedOrganizationData` join to `APPROVED`/`APPROVED_AUTOMATICALLY` submissions), not `OrganizationSummaryView`
- [x] 2.7 Implement the `PENDING` branch: match against other organizations' pending submission data
- [x] 2.8 Build one warning per collision (per design D7 — keep both): an org that matches on both its approved and pending snapshots yields two separate warnings (one `APPROVED`, one `PENDING`), not merged; order `APPROVED` before `PENDING`
- [x] 2.9 Compose the Spanish `message` from the D9 templates ("Coincide con una empresa inscrita (RUT {taxId}) en {campos}." / "...otra postulación pendiente..."; join fields with "y"; fall back to legal name when taxId is null)
- [x] 2.10 Register the route in the admin submissions router; wire response schema `200` + `ApiErrorResponseSchema`; run `pnpm type-check` and `pnpm lint`

## 3. Phase 2 — Web: "Conflictos detectados" section (chips grouped by state)

- [x] 3.1 Add a `useGetSubmissionWarnings(submissionId)` query hook (`apps/web/src/api/query/submissions/`), lazy (`enabled: !!submissionId`), calling `admin/submissions/${id}/warnings`
- [x] 3.2 Add a per-`type` metadata parser/guard for `ORGANIZATION_IDENTITY_COLLISION` (small Zod schema at the render boundary) to safely read `metadata`
- [x] 3.3 Create the `ConflictsSection` component under `apps/web/src/components/dialogs/SubmissionHistory/`: render only when `isOrganizationAccreditation && warnings.length`; amber attention styling consistent with existing patterns; group by state (accredited first, then pending)
- [x] 3.4 Render one numbered collapsed row per conflicting org ("Conflicto N" · organization standing · tax id · legal name); the chip goes through `<StatusChip>` + the app-wide `ORGANIZATION_DISPLAY_STATUS_CONFIG` (Inscrita / No Inscrita) so the standing renders as it does everywhere else, and the colliding submission's status moves into the comparison. No per-state grouping headers
- [x] 3.7 Subtitle of the section states explicitly that the conflicts are referential and the request can be approved anyway
- [x] 3.5 Insert `ConflictsSection` in `ViewSubmissionDialog.tsx` between `CurrentStatusBanner` and `OrgDataSection`; pass the current submission's id/warnings
- [x] 3.6 Run `pnpm type-check` and `pnpm lint`

## 4. Phase 3 — Web: expand to side-by-side comparison

- [x] 4.1 Build the comparison sub-component: on expand, show a side-by-side grid of applicant vs conflicting org over `tradeName`, `legalName`, `taxId`, plus an "Estado de la postulación" row with each side's submission status; one separator per row and generous cell padding so it reads as a grid
- [x] 4.2 Highlight the colliding cell(s) using theme colors (driven by `collisionFields`)
- [x] 4.3 Ensure the layout scales from 1 to N conflicts (per-chip expansion, no horizontal overflow of the dialog)
- [x] 4.4 Run `pnpm type-check` and `pnpm lint`

## 5. Tests

- [x] 5.1 API integration tests for `GET /admin/submissions/:id/warnings`: no collision → empty; legal-name collision with accredited org → `APPROVED` warning; trade-name collision with pending submission → `PENDING` warning; taxId collision; self-exclusion; approved-snapshot-not-displayed-row; multiple conflicts → one warning each; non-admin → forbidden; unknown id → not found; non-accreditation type → empty
- [x] 5.2 API integration tests for the normalization/payload contract: conflicting value stored with surrounding whitespace still matches (both sides normalized); null identity fields never match each other; `«legalName»` message fallback when the conflicting org has no `taxId`; `OUTDATED` organization data ignored; exact Spanish message copy; `metadata.applicant` equals the compared snapshot
- [x] 5.3 Web unit tests (`pnpm test:web`, co-located `*.test.ts`) for `parseCollisionWarnings` (valid / unknown type / malformed metadata / ordering preserved) and for `COLLISION_STATE_CONFIG` (exhaustive over `CollisionState`, labels/tooltips verbatim)

## 6. Finalize

- [x] 6.1 Run `pnpm format && pnpm lint && pnpm type-check`
- [ ] 6.2 Update any affected docs; open PR (English title/description per convention), UI strings in Spanish
