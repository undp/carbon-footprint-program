## Context

`RateMeasurementUnit` is fully derived data:

- The canonical RMU `kg/<abbrev>` is created/renamed/soft-deleted automatically by the cascade in `measurement-unit-management`.
- Non-canonical RMUs (e.g., `ton/MWh`) come from seed data and are tied to specific emission factors.

Three FK columns reference RMUs:

- `EmissionFactor.rateMeasurementUnitId` (required FK).
- `CarbonInventoryLineInput.manualFactorRateUnitId` (optional FK; when an admin overrides the factor manually).
- `CarbonInventoryLineFactor.appliedFactorRateUnitId` (optional FK; the actual factor applied at calculation time).

There is no admin path to mutate RMUs directly today (correctly so — direct edits would break the cascade invariants). What is missing is **observability**: an admin renames an MU, expects the canonical RMU to update, and has no way to verify it without database access. Or an admin sees an unfamiliar RMU referenced by a methodology and wants to look it up. The existing `getAllRateMeasurementUnits` endpoint serves the EmissionEditor flow; it does not surface usage counts.

## Goals / Non-Goals

**Goals:**

- Allow admins to browse the full set of ACTIVE rate measurement units.
- Surface usage counts so admins can understand the impact of measurement-unit edits and identify orphan RMUs.
- Reuse the existing endpoint (no separate admin endpoint).

**Non-Goals:**

- Any mutation of rate units. The screen is read-only.
- Showing soft-deleted RMUs. The endpoint already filters `status: ACTIVE`; this screen does not change that.
- A bulk export. (Could be added later via a dedicated endpoint.)
- Server-side pagination. The dataset is bounded — at most one canonical RMU per MU plus a small number of seeded non-canonical RMUs. The DataGrid's client-side pagination is sufficient.
- Server-side filtering. The endpoint contract gains response fields only; no querystring is added.
- Filter controls on the screen. The current scope is a plain read-only list; filters can be added in a follow-up if usage warrants it.

## Decisions

### 1. Extend the existing endpoint rather than adding an admin variant

**Decision**: Add the per-row counts to `GET /api/measurement-units/rates`. The endpoint remains publicly readable to authenticated users.

**Rationale**: The `EmissionEditor` consumer of this endpoint can ignore the new fields (existing call sites already don't read `referenceCounts`). Adding a parallel admin endpoint would duplicate the query and the mapper. The new fields are inexpensive: three `groupBy` queries against tables that the Prisma planner indexes by FK are negligible at this scale (rate units are O(low hundreds), references are O(thousands)).

**Alternatives considered**:

- **New admin endpoint `GET /api/admin/rate-measurement-units`**: cleaner separation but duplicates roughly 80% of the existing service. Rejected.
- **Compute counts only when a `withCounts` query flag is set**: micro-optimization. Three `groupBy` queries against FK-indexed tables are negligible at this scale. Rejected for simplicity.

### 2. Three separate count fields rather than one total

**Decision**: The response item exposes:

```ts
referenceCounts: {
  emissionFactors: number;
  lineFactorsAsApplied: number;
}
```

…plus a derived `totalReferenceCount: number = emissionFactors + lineFactorsAsApplied`.

**Rationale**: Admins inspecting "why is this RMU referenced 47 times?" benefit from knowing whether the references are emission-factor definitions (configurable by SUPERADMIN), inventory line inputs (created by every user), or applied factors (created at calculation time). The breakdown answers triage questions; the total drives the default sort.

**Alternatives considered**:

- **Total only**: simpler payload, less informative. Rejected.
- **Five separate fields (counting MU references too)**: over-rotates on a UI that doesn't surface MUs. Rejected — the screen lists rate units, not MUs.

### 3. No filtering, no URL-driven state

**Decision**: The screen renders the full ACTIVE list returned by the API. It exposes no filter controls and reads no values from the URL. Default DataGrid sort is `totalReferenceCount DESC`; column header sorting is enabled for all sortable columns.

**Rationale**: The current dataset is small enough (O(low hundreds) of rows) that scrolling and DataGrid's native column-header sorting are sufficient. Skipping filter UI keeps the screen and the endpoint contract minimal; filters can be re-introduced (client-side or server-side) in a follow-up change if real usage shows they're needed.

**Alternatives considered**:

- **Server-side filtering via querystring**: adds three optional fields to the endpoint contract. Rejected — the dataset is small, and widening the contract on a dual-use endpoint creates churn for the EmissionEditor consumer.
- **Client-side filtering with URL-driven state**: bookmarkable URLs are nice but the current screen has no consumers asking for them. Rejected for now in favour of the simplest possible read-only list.

### 4. SUPERADMIN-only on the client; public read on the server

**Decision**: The route at `/admin/rate-measurement-units` has `beforeLoad: requireRole([SystemRole.SUPERADMIN], ...)`. The endpoint stays open to all authenticated users.

**Rationale**: This screen is an "infrastructure inspector" for the platform's reference data — alignment with other SUPERADMIN-only browse screens (e.g., `/admin/methodologies`, `/admin/categories`). The endpoint must remain open because the carbon-inventory `EmissionEditor` flow consumes it for non-admin users (rate-unit pickers in factor entry).

**Alternatives considered**:

- **ADMIN + SUPERADMIN client guard**: makes the screen accessible to a broader admin audience. The user did not specify, but other browse-style admin screens are SUPERADMIN-only; defaulting to that. Easy to relax later.
- **Restrict the endpoint to admin roles too**: would regress the existing carbon-inventory flow. Rejected.

### 5. Read-only DataGrid: no edit toggle, no actions column

**Decision**: The screen renders `StylizedDataGrid` with `disableRowSelectionOnClick`, no `processRowUpdate`, no actions column. Sorting is enabled via the native column header; default sort: `totalReferenceCount DESC`.

**Rationale**: The screen exists to expose data, not to mutate it. Hiding the affordances reduces the chance of an admin filing a bug ("I clicked the row and nothing happened — is editing broken?").

The `totalReferenceCount` column is sortable so admins can find the most-referenced RMUs (or, conversely, orphan RMUs with `totalReferenceCount = 0` that may indicate stale seeds).

### 6. Sidebar entry: top-level "Tasas" until change 3 collapses the group

**Decision**: `MaintainerLayout.tsx` gets a new top-level entry "Tasas" linking to `/admin/rate-measurement-units`, placed adjacent to "Unidades" (and "Magnitudes", which `add-magnitudes-maintainer` introduced as a sibling). The future `regroup-units-sidebar` change collapses all three into a "Unidades" group.

**Rationale**: Same reasoning as `add-magnitudes-maintainer` — leave the sidebar messy until the regroup change ships, rather than introducing the group prematurely with one or two children.

## Risks / Trade-offs

- **[Endpoint dual-use]** → The same endpoint serves admin browsing and end-user picker flows. Adding fields to its response widens the contract for both. Mitigation: the existing call sites read specific fields by name; new fields don't break them. Verify by re-running the EmissionEditor integration tests after the change.
- **[`groupBy` count query overhead]** → Three additional queries per request. At admin browsing scale this is negligible; at picker-flow scale it's also fine because the picker call sites can pass through the new response unchanged (they just ignore the count fields). If profiling later shows the counts dominating cost, the endpoint can be sharded into "with counts" / "without counts" via a query flag without breaking the response contract.
- **[`totalReferenceCount` is derived, not stored]** → If the underlying counts ever go inconsistent (e.g., a hand-modified database), the totals reported to the screen drift from any other count. Mitigation: the totals are computed from the same query results as the breakdowns, so they cannot drift relative to themselves. Cross-source drift is an operations concern, not a screen concern.
- **[No filtering]** → Admins inspecting a large RMU table can only scroll and sort. Mitigation: the dataset is bounded by the count of MUs (themselves O(low hundreds)); plain scroll-and-sort is usable at that size. Filter controls can be added in a follow-up if usage warrants it.
- **[No "Show deleted" toggle]** → Admins inspecting "what happened to this RMU after I soft-deleted the parent MU?" can only verify ACTIVE state; soft-deleted RMUs are invisible. Mitigation: the cascade is well-tested in `add-measurement-units-maintainer`; if drift becomes a recurring concern, a "Show deleted" toggle can be added in a follow-up without changing the endpoint contract.
