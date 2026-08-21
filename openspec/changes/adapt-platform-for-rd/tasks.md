## 1. Unblock external dependencies (start first — the methodology PR at the tip depends on them)

- [ ] 1.1 Send MMARN one consolidated message with the two blocking questions from `design.md` → Open Questions: whether primary/secondary are two selections or three hierarchical levels, and validation of the 66-activity mapping (attach the mapping workbook)
- [ ] 1.2 In the same message, propose the emission-factor sources for the new dimension values (IPCC 2006 Vol. 5 Ch. 3 methane correction factors by disposal-site type; grid factor per passenger-km for cable cars; diesel generation for isolated systems) and ask MMARN to endorse or replace them
- [ ] 1.3 Obtain the ONE territorial catalog (planning region, province, municipality, municipal district, sector/paraje) in a machine-readable form
- [~] 1.4 Obtain the DGII activity list and diff it against the catalog to confirm the 66-activity granularity holds — done against `CIIU.DR 2009` (DGII, 166 pp): structure confirmed (17 sections, 60 divisions, 2,839 activity codes), 28 rows renamed to the official wording, and the document turns out not to name 19 of its 60 divisions at all. See `docs/development/rd-activity-catalog-sources.md`. The mapping itself still needs MMARN
- [ ] 1.5 Agree with MMARN on a database reset window: `seed.ts` skips entirely when `country.count() > 0`, so the catalog replacement requires `pnpm db:reset` and discards inventories captured in the test environment

## 2. PR 1 — Deployment identity · base `rd/integration` · no migration

- [x] 2.1 Rewrite `tools/seed/src/data/base/countries.json`: `País Demo` / `PD` → `República Dominicana` / `DO`
- [x] 2.2 Sweep `countryIsoCode` from `PD` to `DO` across the six base seed files that carry it: `country_organization_size.json`, `country_sector_subsectors.json`, `methodologies.json`, `country_job_positions.json`, `organization_main_activities.json`, `subcategory_recommendations.json`
- [x] 2.3 Confirm the sweep is complete with `grep -rn '"PD"' tools/seed/src/data/base/` and verify no `.ts`/`.tsx` file references the ISO code
- [ ] 2.4 Run `pnpm db:reset` followed by the seed to prove the dataset loads end to end under the new ISO
- [x] 2.5 Run `pnpm format && pnpm lint && pnpm type-check`

## 3. PR 2 — Terminology · base PR 1 · no migration

- [x] 3.1 Rename the maintainer sidebar group from `Perfilamiento` to `Datos generales` and its four children to `Sectores`, `Actividades Económicas`, `Unidades de Actividad`, `Tamaño de la Organización`, leaving routes untouched (`MaintainerLayout.tsx`, `screens/Maintainer/constants.ts`)
- [x] 3.2 Rename step 1 of the inventory flow to `Datos generales` and update its help text (`BusinessProfilingScreen.tsx`, `useBusinessProfilingLabels.ts`, `explanations/standalone/business-profiling.md`)
- [x] 3.3 Replace `rubro` / `subrubro` with `Actividad económica principal` / `secundaria` across the ~29 remaining web files carrying the literals, including `OrganizationFormDialog.tsx`, `OrganizationProfileView.tsx`, `EmissionRankingCard.tsx`, `SectorChartCard.tsx`, `TransparencyScreen.tsx`, `exportCarbonInventoryToExcel.ts` and the six maintainer column hooks
- [x] 3.4 Replace the hardcoded `ProfilingEntityLabel` union in `DeleteWarningDialog.tsx` and update the dialog copy accordingly
- [x] 3.5 Update the API-side Spanish copy: `ParentNotActiveError.ts`, the four `countrySectors` / `countrySubsectors` delete-restore services, `organizationMainActivities/admin/restoreOrganizationMainActivity/service.ts` and `features/forms/organizations/handler.ts`
- [x] 3.6 Update the two affected web tests (`getApiErrorMessage.test.ts`, `exportCarbonInventoryToExcel.test.ts`) and the 10 explanation markdowns that mention `rubro`
- [x] 3.7 Set `TAX_ID_LABEL` / `TAX_ID_LABEL_SHORT` in `packages/constants` to the RNC wording, and delete the hardcoded `Rut` literals in `OrganizationProfileView.tsx:188` and `SubmissionHistory/OrgDataSection.tsx:86`
- [x] 3.8 Rename the `Actividad principal de la organización` form field so it names intensity denominators rather than economic activity (`OrganizationFormDialog.tsx`, `MainActivitiesMaintainerScreen.tsx`, `explanations/standalone/main-activities-maintainer.md`)
- [x] 3.9 Confirm with `grep -rni 'rubro\|subrubro\|perfilamiento'` over `apps/`, `packages/` and `tools/seed/src/data/base/explanations/` that nothing user-facing remains
- [x] 3.10 Run `pnpm format && pnpm lint && pnpm type-check && pnpm test:web`

## 4. PR 3 — Schema additions · base PR 2 · one migration

- [x] 4.1 Add `secondarySubsectorId BigInt?` to `OrganizationData` with its relation to `CountrySubsector`, named so it does not collide with the existing `subsector` relation
- [x] 4.2 Add the self-referencing `Territory` model (name, level, `parentId`) and `territoryId BigInt?` on `OrganizationData`, both foreign keys `onDelete: Restrict`
- [x] 4.3 Write the single migration directory with a timestamp preceding every later migration in the stack, and confirm both columns are nullable so it applies to a populated database
- [x] 4.4 Insert the ten planning regions and thirty-two provinces in the same migration, guarded on an empty table, because `seed.ts` skips a populated deployment
- [x] 4.5 Extend the Zod schemas in `packages/types` for the new organization fields
- [ ] 4.6 Apply the migration against a populated database and verify existing rows survive with `NULL`, and that the 199 territories load — ten planning regions, thirty-two provinces and 157 municipios
- [x] 4.7 Run `pnpm format && pnpm lint && pnpm type-check`

## 5. PR 4 — Organization sizes · base PR 3 · no migration

- [x] 5.1 Replace the eight demo tiers in `country_organization_size.json` with the four Ley 187-17 categories: Microempresa (hasta 10 trabajadores), Pequeña empresa (11-50), Mediana empresa (51-150), Empresa grande
- [x] 5.2 Confirm the size tier is not derived from `employeesCount`, so an organization can declare a tier without disclosing an exact headcount
- [ ] 5.3 Run `pnpm db:reset`, seed, and verify the organization form offers exactly the four tiers
- [x] 5.4 Run `pnpm format && pnpm lint && pnpm type-check`

## 6. PR 5 — Supporting documents for inscription · base PR 4 · no migration

- [x] 6.1 State the base document in `RequiredDocumentsSection.tsx`: the RNC deed or the current DGII registration certificate
- [x] 6.2 State the conditionally required documents as a separate category: current Registro Mercantil and proof of the representative's authority
- [x] 6.3 Run `pnpm format && pnpm lint && pnpm type-check && pnpm test:web`

## 7. PR 6 — RD economic-activity catalog · base PR 5 · no migration

- [x] 7.1 Author `country_sector_subsectors.json` as the 17 categories of the national classifier with their ~66 second-level activities, splitting the five activities that span two sectors into two rows each
- [x] 7.2 Apply the four cross-sector reassignments (crude-oil and gas extraction and petroleum refining to Energía, medical and precision instruments to Salud, waste recycling to Gestión de Residuos) and record them as deliberate exceptions in a comment or accompanying note
- [x] 7.3 Resolve the activities with no direct equivalent: membership organizations and other service activities to Servicios Profesionales y Empresariales, extraterritorial organizations to Administración Pública, and exclude private households with domestic staff as out of scope for corporate reporting
- [x] 7.4 Split `Distribución y Transmisión` into `Transmisión de energía` and `Distribución de energía`
- [x] 7.5 Remap the 19 entries in `organization_main_activities.json` onto the new sector names, deciding which intensity denominator belongs to each sector
- [x] 7.6 Remap the 10 entries in `subcategory_recommendations.json` onto the new sector names
- [ ] 7.7 Run `pnpm db:reset` and seed, confirming neither name-resolution guard in `seedOrganizationMainActivities` nor `seedSubcategoryRecommendations` throws
- [ ] 7.8 Run `pnpm format && pnpm lint && pnpm type-check && pnpm test:api -- /countrySectors --coverage=false`

## 8. PR 7 — Organization form and deletion warnings · base PR 6 · no migration

- [ ] 8.1 Add the `seedTerritories` script wired into `seed.ts` after `seedCountries`, returning early when the table already holds rows
- [ ] 8.2 Add the secondary-activity autocomplete over all ACTIVE subsectors, labelled `Sector — Actividad`, with no second sector selector
- [ ] 8.3 Label the representative identifier as the identity document and attach the cédula/pasaporte help note
- [ ] 8.4 Replace the free-text `Dirección / Región` field with the five dependent territorial selectors, clearing descendants when a parent changes, plus a separate `Dirección física` text field
- [ ] 8.5 Persist the new fields through `organizations/helpers.ts`, `mappers.ts` and the form handler, and surface them on `OrganizationProfileView`
- [ ] 8.6 Extend the sector and subsector `impactedChildren` organization count to include `secondary_subsector_id`, deduplicating an organization that references the same row as both primary and secondary
- [ ] 8.7 Write API integration tests for the secondary-activity round trip, the partial territorial selection, and the deduplicated `impactedChildren` count
- [ ] 8.8 Run `pnpm format && pnpm lint && pnpm type-check && pnpm test:api -- /organizations --coverage=false`

## 9. PR 8 — RD methodology · base PR 7 · no migration · blocked on task 1.2

- [ ] 9.1 Define the commuting `Tipo` dimension for the RD methodology: add `Teleférico`, rename the ride-hailing option to `Taxi/vehículo de transporte individual` without splitting it, spell out `Bicicleta`, and omit both rail options
- [ ] 9.2 Define the solid-waste `Destino` dimension as open dump, controlled dump, sanitary landfill, incineration, recycling and `Otro`
- [ ] 9.3 Define the Scope 2 `Sistema eléctrico` dimension as SENI, isolated systems and `Otro`
- [ ] 9.4 Assign every new dimension value its Dominican emission factor from the sources agreed in task 1.2, giving each `Otro` the highest factor in its dimension
- [ ] 9.5 Enforce the comment requirement in the capture form: reject a line selecting an escape-hatch value whose comment is empty or whitespace-only, surfacing the error against the comment field
- [ ] 9.6 Declare the escape-hatch value names in `COMMENT_REQUIRED_DIMENSION_VALUES`, matched exactly so `Otro país` and `Otro proceso` are unaffected
- [ ] 9.7 Update the three affected subcategory explanation markdowns, including the Scope 2 text that currently promises options the dimension does not offer
- [ ] 9.8 Write API integration tests for the comment requirement: escape-hatch value without a comment rejected, with a comment accepted, whitespace-only rejected, ordinary value unaffected, and an escape-hatch value still resolving a factor
- [ ] 9.9 Run `pnpm format && pnpm lint && pnpm type-check && pnpm test:api -- /emissionFactorDimensions --coverage=false`

## 10. Close out

- [ ] 10.1 Verify the tip of the stack is green in CI (lint, type-check, format:check, API test matrix, `Test (web)`, build)
- [ ] 10.2 Record MMARN's answers to the three Open Questions in `design.md`, and correct the catalog or schema if any answer diverges from the assumption taken
- [x] 10.3 Document the upstream freeze in the branch's README or deployment notes: only security fixes are cherry-picked from Huella Latam, with no periodic rebase

## Implementation notes (2026-08-21)

PRs 1–6 of the stack are open on `rd/integration`, plus a docs-only PR carrying
task 10.3. What was **not** done, and why:

- **Section 1 (external dependencies)** — MMARN correspondence, the ONE
  territorial catalog, the DGII activity list and the reset window are outside
  what can be done from the repository. Everything downstream of them was built
  under the assumptions `design.md` states.
- **PR 7 (organization form + territorial seed) and PR 8 (methodology)** — not
  built. PR 7's territorial selectors need the ONE catalog (task 1.3) and PR 8's
  factors need MMARN's answer on sources (task 1.2). The schema they populate is
  already in place (`territory`, `secondary_subsector_id`), so both are additive when
  the data arrives.
- **Every `pnpm db:reset` / seed / API-test task** (2.4, 4.6, 5.3, 7.7, 7.8) —
  no Postgres or Docker in the authoring environment. `format`, `lint`,
  `type-check` and `test:web` were run green on each PR; the migration in PR 3 is
  hand-written and unapplied, and the two new `countrySectors` integration tests
  in PR 6 are unrun.
- **Task 7.1 shipped 18 sectors, not 17** — the mapping needs both
  `Industria Cementera`, the target of the non-metallic-minerals split, and
  `Bienes Raíces`. Keeping the existing sector names also made 7.5/7.6 a no-op
  for sector resolution.
- **Task 10.1 cannot be satisfied as written** — `.github/workflows/ci.yml`
  triggers on `pull_request: branches: [main]`, so no check runs on a PR based on
  `rd/integration` or on another stack branch. The stack's CI evidence is the
  local gate runs above until it merges to a `main`-based branch, or until the
  trigger is widened.
