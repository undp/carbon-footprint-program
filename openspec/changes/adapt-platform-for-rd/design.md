## Context

MMARN returned ten observations on the test environment plus a proposed mapping of the national classifier onto the platform's catalog. Translating them into work exposed three constraints that shape every decision below.

**The branch is terminal.** The RD adaptation lives on a long-lived branch that RD inherits and that is never merged into Huella Latam. Deployment-specific data is therefore edited in place in `tools/seed/src/data/base/`, and abstractions justified only by multi-deployment reuse (moving labels into `VOCAB`, a per-country dimension-value enable/disable mechanism, a configurable required-documents list) are dead weight and are not built.

**Methodology is already per-country and already editable.** `methodologies.json` is a list of methodologies each carrying a `countryIsoCode`, and maintainer APIs exist for `methodologies`, `emissionFactorDimensions`, `emissionFactors`, `countrySectors`, `countrySubsectors`, `countryOrganizationSizes` and `explanations`. Most observations are therefore configuration, not development.

**Maintainer cost is the binding constraint.** `deleteCountrySectorService` soft-deletes across four entities using denormalized parent columns, and restore validates the parent chain via `ParentNotActiveError`. Any new catalog level lands inside that convention and forces every catalog hanging off it to learn about it. This is why the design avoids new catalog levels and new maintainers wherever the observations allow.

Two capabilities already exist and were mistaken for gaps during analysis: `CarbonInventoryLineInput.comment` with `EmissionEditorCommentDialog` already captures free text per line, so `Otro (especifique)` needs no new pattern; and `manualFactor` / `manualFactorSource` already support user-supplied factors.

## Goals / Non-Goals

**Goals:**

- Satisfy the ten observations as written, using the platform's existing configuration surfaces before writing code.
- Keep the schema change additive and confined to a single migration.
- Add no new catalog level and no new maintainer screen.
- Keep the stacked-PR chain shallow, so rebases stay cheap on a branch that diverges from upstream indefinitely.

**Non-Goals:**

- Multi-country support in the seed, or any per-deployment parameterization of labels, dimension values or document lists.
- Making the platform's demo dataset ("País Demo") reflect Latin American reality. Several observations — open dumps, cable cars, isolated grids, ride-hailing — describe most of the region, but upstreaming them is out of scope for this branch.
- Reworking the intensity-denominator catalog (`OrganizationMainActivity`) beyond renaming its misleading label.

## Decisions

### 1. Secondary economic activity: a second reference into the existing two-level catalog

Page 1 of the observations asks for "un catálogo nacional oficial con sector, actividad económica principal y actividad económica secundaria". Those are three _fields_, not three catalog levels: `CountrySector` supplies the sector, `CountrySubsector` supplies both activities, and the organization gains one nullable `secondary_subsector_id`. Primary and secondary are how a Dominican company declares itself to the DGII, and page 5, discussing the same subject, asks only to "sustituir 'rubro' por 'Actividad económica'" — singular, with no hierarchy.

_Alternatives considered._ A third catalog level (sector → division → group) would require a new table with its own status enum and partial unique index, a full API feature mirroring `countrySubsectors`, extending the sector cascade from four entities to five and the restore chain from two levels to three, a third FK on `OrganizationMainActivity` with new backfill logic, a decision about whether `SubcategoryRecommendation` re-scopes, and a new maintainer screen with its columns hook and dialogs — to model something the observations do not ask for. A many-to-many secondary-activity table adds all of that plus multi-select UI. Deferring the secondary activity leaves observation 2 open.

_Consequence._ The secondary activity is selected through a flat autocomplete over all activities labelled `Sector — Actividad`, not a second sector-plus-activity pair, so a hotel with an agricultural operation can declare a cross-sector secondary. Inherited for free: the sector cascade deliberately leaves organization-owned rows `ACTIVE` so deleting a catalog row never rewrites a country's historical footprint, and the new reference behaves identically.

### 2. Catalog granularity: the classifier's two upper levels

Sectors become the 17 categories of the national economic-activity classifier and activities its 61 second-level entries, with the five that span two sectors authored as two rows each — roughly 66 activities. The finer-grained exceptions in the mapping workbook are resolved at authoring time by splitting the row, not by introducing a finer level at runtime. The workbook is an authoring input, not a runtime artifact.

_Alternatives considered._ The next level down (201 entries) has no mapping today and would triple what MMARN must validate. The DGII's 487 or 2,851 finest-grained entries would force server-side pagination and search: the profiling maintainers paginate client-side (`paginationModel` in local state, no `paginationMode="server"`, no `rowCount`), so the whole catalog is fetched into the browser on every visit. At 66 rows nothing changes; at 487 both the API endpoints and the two screens need rework.

_Consequence._ `seedSubcategoryRecommendations` and `seedOrganizationMainActivities` resolve sectors **by exact name and throw** when a name is absent. Replacing the sector taxonomy therefore breaks the seed loudly until 10 recommendation entries and 19 intensity-denominator entries are remapped. The second remapping is a judgement call, not a rename: it decides which intensity metric belongs to which sector.

### 3. The activity catalog stays fully editable

Sectors and subsectors keep their existing CRUD, cascade and restore. Read-only, seed-managed catalogs were considered and rejected by the project owner in favour of zero development cost and MMARN's ability to correct the catalog without a deploy.

_Alternatives considered and declined._ Read-only screens; an `isOfficial` flag blocking edits on seeded rows while allowing locally added ones; retaining CRUD behind a warning dialog.

_Accepted risk._ An admin can rename or delete a row of an official national classifier, and nothing records that the row came from the DGII, so the catalog can drift from the tributary registry silently. This also makes decision 9 mandatory rather than optional: because deletion remains a live path, the `impactedChildren` count must include secondary-activity references.

### 4. Territorial location: one self-referencing table, one reference, no maintainer yet

Page 5 fixes the shape — five levels, dependent dropdowns, "según aplique", plus a free-text physical address — but not the model. A single self-referencing `territory` table holds the hierarchy; the organization stores one `territory_id` pointing at the most specific node the user actually knows, and ancestors are derived by walking `parentId`. Administrative boundaries change by law, nobody asked to edit them, and the observation calls the catalog "oficial", so no maintainer ships now. It is an ordinary catalog table, so adding one later is additive: endpoints, a screen, and a `status` column if it needs soft-delete.

_Alternatives considered._ Five nullable columns on `organization_data` make queries and exports trivial but permit incoherent combinations (a municipality outside the selected province) and require service-layer validation. Holding the hierarchy as a constant in application code and storing the choice as text avoids the table entirely and was seriously considered — every catalog table in this codebase carries a maintainer, so one that deliberately does not invites the question forever. It loses on the catalog not being in hand yet: the two levels below municipality arrive from the IDE-RD layers later, and loading them into a table is data where loading them into a code constant or an enum is a deploy. Loading only province and municipality would halve the work but contradicts an enumeration the observation spells out.

_Consequence._ Filtering organizations by province needs a recursive CTE or a closure table. Both foreign keys are `RESTRICT` rather than Prisma's default `SET NULL`: nulling a deleted node's parent would silently promote its children to roots, where they would surface in the top-level selector as planning regions, and nulling an organization's reference would rewrite a declared location — which the repository's catalogs never do.

### 5. The territorial catalog ships in the migration, not only in the seed

`seed.ts` skips entirely once a country exists, so the RD test environment — already populated — would never receive the territories by seeding. The migration inserts them, guarded on an empty table. `seedTerritories` stays as the path for a database created without migrations and returns early when the table already holds rows.

_Consequence._ No migration in this repository carried data before, so this is a new pattern; it is justified by the branch being terminal and the target deployment already populated. The seed's global count assertion had to go — the table may now hold rows the seed file does not describe — and the `testing` territorial fixture with it, so the API tests assert against the Dominican hierarchy the migration guarantees is present.

### 6. `Otro (especifique)` is enforced by a shared constant naming the escape hatches

`COMMENT_REQUIRED_DIMENSION_VALUES` lists the value names that oblige their capture line to carry a comment. The API and the capture form apply the same predicate, and the API rejects the batch before its transaction.

_Alternatives considered._ A dedicated boolean column on the dimension value survives a rename, which a name rule does not — but it only earns its schema if an administrator can toggle it, which means a maintainer surface for a deployment that seeds its methodology. Matching by prefix rather than exactly would sweep in `Otro país` and `Otro proceso`, which are ordinary options that name themselves. Requiring a comment on every line maximizes traceability at the cost of friction on inventories with hundreds of lines, and invites filler text. Leaving the comment optional contradicts the word _especifique_ in observations 4 and 6.

_Consequence._ Renaming `Otro` from the maintainer silently disables the requirement for that value. The accepted mitigation is that the constant is one line to update and the methodology is seed-managed on this branch.

### 7. `Otro` carries the most conservative factor in its dimension

Page 4 requires that "cada alternativa corresponda a un tratamiento metodológico y factor de emisión definido", so `Otro` needs a factor, not an exemption. It takes the highest factor of its dimension, which never understates emissions, and the mandatory comment gives MMARN what it needs to reclassify the line later.

_Alternatives considered._ Leaving `Otro` without a catalog factor and requiring `manualFactor` plus `manualFactorSource` is the most rigorous option and needs no new code, but blocks any user without a documented factor at hand. A dimension average is unbiased in aggregate yet understates individual cases, which is the error hardest to defend in a national registry.

### 8. Ride-hailing is not split until the factors differ

Observation 5 conditions the breakdown of taxi, digital-platform vehicle and shared transport on "solo si la metodología asigna factores diferentes". Until Dominican factors distinguish them, the catalog carries one `Taxi/vehículo de transporte individual` value.

### 9. Deletion warnings count secondary references

`DeleteWarningDialog` receives `impactedChildren.organizationData`: how many organizations will end up pointing at a soft-deleted row. That count must include organizations referencing the subsector as their secondary activity, or an admin confirms a deletion against an understated number. This is the only maintainer change the design forces, and decision 3 makes it non-negotiable.

### 10. One migration in the trunk; one pull request for the form

Both new columns are nullable and the new table starts empty, and they land in a single migration early in the stack, so no later pull request carries one and no two pull requests compete for migration timestamps. Separately, the secondary activity, territorial selectors and physical address all edit `OrganizationFormDialog.tsx`; splitting them across stacked pull requests means three reviews and two rebases of one file, so they ship as one pull request with modular commits.

_Consequence._ The work ships as one linear stack of eight pull requests rather than ten, with a single migration at position three. Consolidating the form work is what keeps the chain at eight: split across three pull requests it would be ten, and every one of them stacked on the same file.

### 11. The branch freezes against upstream

Upstream changes to `data/base/*.json` will conflict with the RD edits indefinitely. Only security fixes are cherry-picked; there is no periodic rebase.

### 12. Organization size and headcount stay independent

The Ley 187-17 tier is not derived from `employeesCount`, so an organization can declare a tier without disclosing an exact headcount.

## Risks / Trade-offs

- **The seed refuses to run against a populated database** → `seed.ts` skips entirely when `country.count() > 0`, so replacing the catalogs requires a full reset (`pnpm db:reset`). Any inventory captured in the RD test environment against the demo catalog is lost. Coordinate the reset with MMARN before deploying the catalog work.
- **The catalog can drift from the DGII silently** (decision 3) → accepted by the project owner.
- **The 66-activity mapping is a proposal, not an official classification** → author and merge it, then correct on MMARN feedback. Corrections are seed edits over 66 rows, not code rework; waiting for validation would stall the stack.
- **Dominican emission factors for the new dimension values are external data, and their pull request sits at the tip of a linear stack** → propose concrete sources rather than requesting factors in the abstract: IPCC 2006 Vol. 5 Ch. 3 methane correction factors by disposal-site type map closely onto open dump, controlled dump and sanitary landfill; cable cars are electric traction priced at the grid factor per passenger-kilometre; isolated systems are typically diesel generation and therefore above the national grid.
- **`OrganizationMainActivity` collides by name with the new fields** → its label says "Actividad principal de la organización" but it holds intensity denominators. Rename it in the terminology pull request, before the economic-activity fields exist, or the form ends up with two near-identical names and incompatible meanings.
- **Filtering by province requires recursive traversal** (decision 4) → acceptable while the only consumer is admin reporting; revisit with a closure table if dashboards query it per request.

## Migration Plan

The schema migration is purely additive — five nullable or defaulted columns plus one new table — so it deploys without downtime and reverts cleanly. The catalog and methodology replacement is not reversible in place: it requires a database reset, which is why it is sequenced after the schema work and coordinated with MMARN.

The work ships as a single linear stack of stacked pull requests. Each pull request's base is the one before it; the root base is the RD integration branch. Only PR 3 carries a migration, so no two pull requests compete for migration timestamps.

| PR  | Branch                              | Base             | Scope                                                                      |
| --- | ----------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| 1   | `feat/mati/rd-deployment-identity`  | `rd/integration` | Country identity: `countries.json` and the ISO sweep across six seed files |
| 2   | `feat/mati/rd-terminology`          | PR 1             | ~36 code files and 10 explanation markdowns                                |
| 3   | `feat/mati/rd-schema-additions`     | PR 2             | Two columns, the `territory` table and its data — **the only migration**   |
| 4   | `feat/mati/rd-organization-sizes`   | PR 3             | Ley 187-17 tiers                                                           |
| 5   | `feat/mati/rd-supporting-documents` | PR 4             | Documents required at inscription                                          |
| 6   | `feat/mati/rd-activity-catalog`     | PR 5             | 17/66 and the 29 dependent seed entries                                    |
| 7   | `feat/mati/rd-organization-form`    | PR 6             | Four form fields, ONE territorial seed, deletion-warning count             |
| 8   | `feat/mati/rd-methodology`          | PR 7             | Dimension values, factors, comment flags, explanations                     |

The order is fixed by four constraints and one scheduling choice.

**Constraints.** The ISO sweep (PR 1) touches the six seed files that PRs 4, 6 and 8 rewrite, so it goes first or those rewrites conflict with it. The terminology rename (PR 2) touches `OrganizationFormDialog.tsx` and the `ProfilingEntityLabel` union that PR 7 edits, and fixes the names every later pull request builds on. The schema additions (PR 3) must precede every pull request that populates the new columns — PRs 6, 7 and 8. PR 7's territorial selectors need the `territory` table from PR 3 and the ONE seed it ships itself.

**Scheduling choice.** PRs 4 and 5 are the two smallest and carry no external dependency, so they sit immediately after the trunk where the stack is shallowest. PR 8 sits at the tip because its Dominican emission factors are external data: in a linear stack an externally blocked pull request stalls everything behind it, so the one that can stall goes last. Its external dependency is raised on day one (tasks 1.1 and 1.2) even though it merges last.

PR 6 precedes PR 7 deliberately: reviewing the secondary-activity search field is more meaningful once the real 66-activity catalog is loaded than against the 150 demo subsectors.

**Cost of the linear shape.** A review comment on an early pull request forces a rebase of every pull request above it — a change requested on PR 2 rebases six branches. GitHub retargets bases automatically as each pull request merges, but the rebases are manual. This is the accepted price of a single reviewable order; the alternative, branching PRs 4 through 8 off the trunk in parallel, trades that away for five concurrent review threads with no defined merge order.

## Open Questions

- Does MMARN confirm that "actividad económica principal y secundaria" are two selections from one catalog rather than three hierarchical levels? Decision 1 assumes the former. Being wrong now costs one nullable column; being wrong after PR 4 costs a full API feature and a maintainer screen.
- Are the proposed emission-factor sources acceptable for the new dimension values, and does MMARN supply Dominican factors or endorse the IPCC defaults?
- Does MMARN validate the 66-activity mapping as authored, and which intensity denominator belongs to each of the 17 sectors once the 18 demo rubros disappear?
