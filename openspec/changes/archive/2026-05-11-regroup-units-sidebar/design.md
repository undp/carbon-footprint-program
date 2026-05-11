## Context

The admin sidebar in `MaintainerLayout.tsx` mixes two organizational patterns:

- **Collapsible groups** for `Metodologías` and `Perfilamiento` — multiple related entries collected under a parent header that expands/collapses.
- **Flat top-level entries** for one-off destinations like `Unidades` and (after the two prior changes) `Magnitudes` and `Tasas`.

The two prior changes (`add-magnitudes-maintainer`, `add-rate-measurement-units-screen`) explicitly deferred sidebar consolidation to this proposal, on the principle that a one-child group is wasted UI and a two-child group is an awkward stopover. With three children present, the consolidation pays off: the sidebar's information density returns to what existed before the work began, and the `Unidades` group reads as a peer of `Metodologías` and `Perfilamiento`.

There is no architectural decision required — the group pattern is already implemented for two other groups, and this proposal simply applies it to a third. The remaining design questions are minor: child order, the rename of "Unidades" → "Unidades de medida", and the role guard on the parent.

## Goals / Non-Goals

**Goals:**

- Group `Magnitudes`, `Unidades de medida`, and `Tasas` under a single collapsible parent named "Unidades", mirroring the existing pattern.
- Rename the leaf entry from "Unidades" to "Unidades de medida" so the label is unambiguous when the parent is also named "Unidades".
- Auto-expand the parent when any child route is active.

**Non-Goals:**

- Moving any other sidebar entry. Methodology grouping, Perfilamiento grouping, and standalone entries are unchanged.
- Restructuring routes. All three children keep their existing paths and existing route-level role guards.
- Changing the underlying screens, endpoints, or types.
- Touching mobile/responsive behavior beyond what the existing group pattern already provides.

## Decisions

### 1. Use the existing collapsible-group component

**Decision**: Apply whatever collapsible-group abstraction `MaintainerLayout.tsx` currently uses for "Metodologías" and "Perfilamiento" — do not introduce a new component, and do not extract a new shared abstraction.

**Rationale**: Two existing call sites is too few to justify abstraction work in this proposal. If a future fourth group appears and the call sites diverge, that's the moment to refactor.

### 2. Rename "Unidades" → "Unidades de medida"

**Decision**: The leaf-entry label changes from "Unidades" to "Unidades de medida". The route path (`/admin/units`) and the route constant (`Routes.ADMIN_UNITS`) stay the same — only the human-readable label in the sidebar changes.

**Rationale**: With the parent group also named "Unidades", a child called "Unidades" reads recursively. "Unidades de medida" matches the underlying entity name (`MeasurementUnit`) and disambiguates against the parent.

The screen's title bar (inside the page itself) MAY also be updated for consistency, but this is a low-priority polish item — not part of the spec deltas.

**Alternatives considered**:

- **Rename the parent to something else (e.g., "Unidades y tasas")**: longer, less crisp, doesn't match the established short-noun pattern of "Metodologías" / "Perfilamiento". Rejected.
- **Keep "Unidades" on both parent and child**: confusing UI; the visual hierarchy disambiguates them, but the screen-reader experience and any text-search of the sidebar both suffer. Rejected.

### 3. Child order: Magnitudes → Unidades de medida → Tasas

**Decision**: Order children by the natural data hierarchy:

1. **Magnitudes** — defines a physical dimension.
2. **Unidades de medida** — instances of a magnitude with conversion factors.
3. **Tasas** — derived ratios over two units.

**Rationale**: Top-down conceptual progression mirrors how an admin reasons about the data and how documentation typically introduces it. Reverse alphabetical (`Tasas, Magnitudes, Unidades de medida`) or alphabetical (`Magnitudes, Tasas, Unidades de medida`) both fragment the conceptual flow.

### 4. Parent group has no role guard; children retain theirs

**Decision**: The "Unidades" group is rendered for any user who reaches the admin layout (i.e., already passed the layout-level guard). Each child entry continues to apply its own route-level `requireRole` guard:

- Magnitudes: `[ADMIN, SUPERADMIN]` (set by `add-magnitudes-maintainer`).
- Unidades de medida: `[ADMIN, SUPERADMIN]` (unchanged from `add-measurement-units-maintainer`).
- Tasas: `[SUPERADMIN]` (set by `add-rate-measurement-units-screen`).

A `USER` who somehow reaches the admin layout would see the group expand to children whose routes redirect them away — same posture as today's `Metodologías` group.

**Rationale**: Hiding children based on role is a separate, larger concern (it would imply role-aware sidebar rendering across every group). The current admin layout already trusts route-level guards to handle access; matching that posture keeps the change minimal.

**Alternatives considered**:

- **Hide the Tasas child for non-SUPERADMIN admins**: cleaner UX but introduces a precedent for role-aware sidebars that is not consistently applied elsewhere. Defer to a future, broader UX change. Rejected for this proposal.

### 5. Auto-expand on active child

**Decision**: When the current route matches any of the three children, the parent group SHALL render in its expanded state on first render. This matches the existing behavior of "Metodologías" and "Perfilamiento" — implementations of those groups already use the active-route check; reuse the same logic.

**Rationale**: A collapsed group obscuring the active page is disorienting. The existing groups solve this; this proposal just inherits the solution.

## Risks / Trade-offs

- **[Pure UI change, very low risk]** → The only failure mode is visual: a malformed group, a missing icon, or a missed active-child highlight. Manual smoke test covers this.
- **[Label rename in only one place]** → If any other surface (CLAUDE.md, docs, screenshot) references "Unidades" as the label of the leaf maintainer, it could read stale after this change. Mitigation: a documentation grep step in the tasks. The rename is purely cosmetic — no constants, route names, or stored data change.
- **[Sequence dependency]** → This change references `Routes.ADMIN_MAGNITUDES` and `Routes.ADMIN_RATE_MEASUREMENT_UNITS`, which only exist after the prior two changes. Merging this change before either of them would break the build. Mitigation: the proposal explicitly states the dependency, and the sequence is documented in the user-facing rollout note.
