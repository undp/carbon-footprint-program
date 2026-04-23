## Context

`SubcategoryRecommendation` is a simple join table with the fields `id`, `sectorId`, `subsectorId?`, `subcategoryId`, and timestamps. A single `(sectorId, subsectorId, subcategoryIds[])` "group" is represented as N rows — one per subcategory — sharing the same sector/subsector pair. The table is consumed by `getSubcategoryRecommendations/service.ts`, which returns different row sets based on the `SUBCATEGORY_RECOMMENDATION_MODE` system parameter:

- `UNION` — returns recommendations for the org's sector ∪ sector+subsector; a `null` subsector row is treated as a wildcard that applies to every inventory under the sector.
- `SPECIFIC` — returns recommendations matched exactly on the org's `(sectorId, subsectorId)`; a `null` subsector row only matches inventories with no subsector.

Today the table is seeded from `seedSubcategoryRecommendations.ts` and has no write path from the app. Admins need to edit the recommendation matrix directly. The existing Categories/Subcategories maintainer (`apps/web/src/screens/Maintainer/screens/SubcategoriesMaintainerScreen.tsx` + `MaintainerDataGrid`) is the established pattern for admin CRUD against reference tables, and it is the target model for this feature.

## Goals / Non-Goals

**Goals:**

- Ship a role-gated (`ADMIN` / `SUPERADMIN`) admin screen for editing the `(sector, subsector) → subcategories` matrix.
- Preserve historical edits with a soft-delete + audit trail on `SubcategoryRecommendation`.
- Keep the consumer endpoint semantics identical for end users (it just filters out soft-deleted rows).
- Reuse the existing maintainer primitives (`MaintainerDataGrid`, `MaintainerScreenLayout`, `SIDEBAR_DEFS`) so the new screen is consistent with Categories/Subcategories.
- Offer a dynamic null-subsector label that matches the active `SUBCATEGORY_RECOMMENDATION_MODE` so admins see the correct semantic in-context.

**Non-Goals:**

- Changing the semantics of `SUBCATEGORY_RECOMMENDATION_MODE` or migrating existing rows when the mode flips post-deployment. The mode is treated as fixed for a given country deployment; rows keep whatever semantic they were created under.
- Reactivating previously DELETED rows. Every save inserts fresh ACTIVE rows and leaves DELETED history untouched.
- Filtering, pagination, or search in the first pass — matches the simplicity of the other maintainers.
- Adding a dedicated `DELETE` endpoint — group deletion is expressed as `PUT { subcategoryIds: [] }`.
- Introducing a `DEFAULT_COUNTRY_ID` system parameter. We mirror the `createMethodology`/`createOrganization` precedent (`country.findFirst({ orderBy: { id: "asc" } })`) and leave a `TODO` to migrate once the parameter exists.

## Decisions

### Decision 1 — Soft-delete with audit fields, drop the composite unique constraint

**Choice:** Add `status: SubcategoryRecommendationStatus { ACTIVE, DELETED }` (default `ACTIVE`), `createdById`, and `updatedById`. Drop `@@unique([subcategoryId, sectorId, subsectorId])`. Enforce "at most one ACTIVE row per tuple" inside the upsert service transaction.

**Rationale:** Keeping the unique constraint would require either hard-deleting rows (losing audit history) or encoding `status` into the constraint (`@@unique(... status)` which still blocks resurrection scenarios and leaks the soft-delete detail into the schema). Letting the transactional diff enforce uniqueness on ACTIVE rows keeps the history table-pure: DELETED rows accumulate freely, and the service is the single source of truth for "what is currently active". Mirrors the way `EmissionFactorDimension` handles versioning — audit-friendly, query-cheap.

**Alternatives considered:**

- `@@unique([subcategoryId, sectorId, subsectorId, status])` — still blocks re-adding a previously ACTIVE row after it has been DELETED once the pattern repeats; leaks status into constraint territory.
- Hard-delete — loses history and the audit motivation.

### Decision 2 — Split writes into POST (create, 409 on conflict) and PUT (idempotent bulk-replace); no `DELETE`

**Choice:** Two write endpoints. `POST /subcategory-recommendations` (body `{ sectorId, subsectorId, subcategoryIds }`, min 1 subcategory) creates a new group; it fails with **409 Conflict** if any ACTIVE row already exists for the tuple. `PUT /subcategory-recommendations?sectorId=&subsectorId=` (body `{ subcategoryIds: number[] }`) is an idempotent bulk-replace: it diffs the submitted ids against existing ACTIVE rows, soft-deleting removed rows and creating fresh ACTIVE rows for additions. `PUT` with an empty array soft-deletes every ACTIVE row in the group and is the _only_ deletion path — there is no dedicated `DELETE` endpoint and no row-delete action in the grid.

**Rationale:** An earlier single-`PUT`-upsert design looked cleaner on paper but created a real UX landmine: when an admin added a temp row for a `(sector, subsector)` pair that already existed in the grid, a bulk-replace `PUT` would silently overwrite the existing group's subcategories. Splitting create and update surfaces the conflict explicitly: the admin gets a **409** with a Spanish message prompting them to edit the existing group instead. `PUT` stays idempotent so stale-cache edits don't 404 — simpler code path, no new error surface, and if two admins concurrently empty or modify the same group the end state is still consistent.

Empty-body `PUT` as the delete path keeps the API surface small and matches admin mental model: "remove everything from this group → it vanishes on next render". No separate mutation, no trash icon, one less UI element to document.

**Alternatives considered:**

- Single `PUT` upsert (earlier version of this design) — silent overwrite landmine, explicit in the exploration phase.
- Dedicated `DELETE /subcategory-recommendations?sectorId=&subsectorId=` — redundant with `PUT { subcategoryIds: [] }`; extra endpoint, extra test, no new capability.
- Strict `PUT` that 404s when no ACTIVE rows exist — rejected for simplicity. Idempotent `PUT` doesn't need a new error code or a matching frontend handler, and the stale-cache scenario is rare in this admin-only, low-traffic screen.
- Per-row endpoints — misaligned with how admins think (groups, not rows).

### Decision 3 — Transfer-list modal instead of inline multi-select chips

**Choice:** Render the "Subcategorías" column as a read-only chip preview plus an "Editar" button that opens a two-column transfer-list dialog (`SubcategoryTransferListDialog`) grouped by category.

**Rationale:** Subcategory names are long (frequently >60 chars) and a single group can reference dozens of them. Inline chip multi-select in a grid row creates horizontal overflow, truncation, and poor discoverability of available options. A transfer list gives admins a scannable, grouped picker with room for the full names and a clear distinction between "available" and "selected". This matches the complexity ceiling of the data without polluting the grid row.

**Alternatives considered:**

- Autocomplete multi-select inline — feasible for 3–5 items, breaks down past that; grouping by category is awkward inline.
- Drawer-based edit form — heavier interaction; the transfer list is tighter and scoped to the single "which subcategories?" question.

### Decision 4 — Dynamic null-subsector label driven by `SUBCATEGORY_RECOMMENDATION_MODE`

**Choice:** Read `SUBCATEGORY_RECOMMENDATION_MODE` via the existing system-parameters endpoint on screen mount. Render `null` as **"Todos los subsectores"** under `UNION`, **"Sin subsector especificado"** under `SPECIFIC`. Do not migrate or warn on mode flip.

**Rationale:** The same `null` value means different things depending on the mode, and admins need to understand what they're committing to. Fetching the parameter on the client keeps the logic colocated with the UI that renders the label — the API doesn't need to know or care. Mode flips post-deployment are out of scope: in practice the value is fixed per country and rewriting row semantics on a flip would require a migration with ambiguous truth.

**Alternatives considered:**

- Server-side resolution (API returns the localized label) — mixes presentation into the data endpoint and couples the API to UI vocabulary.
- Static label ("Sin subsector") — ambiguous under `UNION` where the row is a wildcard, not a "no subsector" marker.

### Decision 5 — Country-scoping via `findFirst({ orderBy: { id: "asc" } })`

**Choice:** In the maintainer list and option-list queries, resolve the country via `prismaClient.country.findFirst({ orderBy: { id: "asc" } })` and scope `CountrySector` / `CountrySubsector` queries to that country. Leave a `TODO` comment noting a `DEFAULT_COUNTRY_ID` system parameter should replace this once available.

**Rationale:** Mirrors the precedent in `createMethodology/service.ts` and `createOrganization/service.ts`. The consumer endpoint is left untouched — the organization's `sectorId` is already FK-bound to a country, so filtering is implicit there. The scoping only matters for the maintainer's option lists and grouped list query, which otherwise could leak multi-country data in hypothetical future deployments.

**Alternatives considered:**

- Introduce `DEFAULT_COUNTRY_ID` now — out of scope; doing it properly requires a separate change touching seeds, system parameters, and every site that resolves "the country". The `TODO` plus the consistent `findFirst` pattern keeps this change tight.

### Decision 6 — Confirm-dialog on empty save of an existing group

**Choice:** When an admin saves an existing grid row with `subcategoryIds.length === 0` (i.e., they cleared every subcategory in the transfer list), fire a confirmation dialog ("¿Eliminar todas las recomendaciones de este grupo?") before firing the `PUT { subcategoryIds: [] }` mutation. For temp (newly-added) rows, the transfer list's Save button is disabled when no subcategory is selected — creating an empty group is blocked at the form level, not confirmed.

**Rationale:** Emptying an existing group is the deletion path. A confirmation dialog is the cheapest safeguard against accidental clears, and the admin mental model is clear: "I just removed everything, does the system understand that means delete?" For new rows, an empty selection is semantically nonsense (POST validation requires `min(1)` anyway) — disabling Save is faster feedback than a dialog. The dialog pattern already exists elsewhere in the app — reuse the existing `ConfirmDialog` component if present instead of introducing a new one.

### Decision 7 — Branch the save flow by row state: temp rows POST, existing rows PUT

**Choice:** The maintainer form hook tracks whether a grid row is a temp row (synthetic id like `temp-N`, no server counterpart yet) or a persisted row (composite id `${sectorId}-${subsectorId ?? "null"}`). On save, temp rows submit via the `createSubcategoryRecommendation` mutation (`POST`); existing rows submit via the `updateSubcategoryRecommendation` mutation (`PUT`). The frontend error handler for `POST` maps the server's 409 to a Spanish message and keeps the temp row in place so the admin can either delete it or change the `(sector, subsector)` tuple.

**Rationale:** This mirrors standard maintainer dirty-tracking (the Subcategories maintainer already distinguishes temp from saved rows). Keeping the two mutations as separate hooks makes each call site explicit and gives the error surfaces independent semantics: `POST`'s 409 deserves a dedicated error path ("ya existe — edítala"); `PUT` stays idempotent and errorless under normal admin operation. The grid's temp-id space (`temp-N`) and composite-id space (`${s}-${ss|null}`) are disjoint, so React key collisions are impossible even when a temp row targets a tuple that already has a persisted row in the grid.

**Alternatives considered:**

- Single mutation that branches internally on row state — merges two error surfaces into one handler; frontend ergonomics worse.
- Resolve conflicts client-side before `POST` (check cached list for existing tuple) — useful as a fast-path hint, but the 409 server check must exist anyway, so the client-only pre-check is optional polish, not a replacement.

## Risks / Trade-offs

- **Growing DELETED history** → Mitigation: no cleanup job in this change. The table stays small in practice (sectors × subsectors × subcategories is bounded by methodology). Revisit if row counts become a performance problem.
- **Transactional uniqueness check vs. schema constraint** → Mitigation: `POST` runs its conflict check (any ACTIVE rows for the tuple?) inside the same transaction as its inserts, and `PUT` runs its diff inside a `prisma.$transaction`. As long as every writer goes through these services, ACTIVE uniqueness per tuple holds. Tests assert the invariant explicitly (delete-then-readd yields exactly one ACTIVE row per tuple).
- **Concurrent-POST race** → Accepted. Two admins hitting `POST` for the same `(sector, subsector)` in the narrow window between conflict check and commit can both succeed if they pick disjoint subcategory ids, producing a merged ACTIVE group. No data corruption; the end state is a valid group. Explicitly accepted by the user given the admin-only, low-traffic nature of the screen.
- **Dynamic label drift on mode flip** → Accepted. Out of scope per Decision 4. Operators who flip the mode accept responsibility for communicating the semantic change to admins; there is no automated migration.
- **Country-scope `findFirst` is a placeholder** → Mitigation: `TODO` comment and alignment with existing precedents. When `DEFAULT_COUNTRY_ID` lands, the pattern updates in one sweep across `createMethodology`, `createOrganization`, and this feature.
- **No optimistic UI** → Accepted. Mutations invalidate the list query on success; the grid is small enough that refetch latency is negligible. Aligns with existing maintainer behavior.

## Migration Plan

Dev-phase change — no production data migration required.

1. Edit the existing schema/migration in-place (per project memory rule: direct migration edits, not incremental migrations during dev).
2. Regenerate the Prisma client (user runs `prisma generate` per the no-build-commands memory rule).
3. Re-run the subcategory recommendations seed — default `ACTIVE` status applies, audit fields stay null on seeded rows.
4. Deploy frontend + API together; no feature flag needed since the maintainer is net-new UI gated to admins.

## Open Questions

- None blocking. The `DEFAULT_COUNTRY_ID` system parameter is deferred by design (see Decision 5) and tracked via `TODO` comments.
