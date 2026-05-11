## Why

After `add-magnitudes-maintainer` and `add-rate-measurement-units-screen` ship, the admin sidebar carries three separate top-level entries — "Magnitudes", "Unidades", and "Tasas" — that are conceptually one feature area: managing units of measurement and their derived rates. The other admin feature areas (`Metodologías`, `Perfilamiento`) are already grouped as collapsible sections; leaving the unit-related entries flat is inconsistent and clutters the sidebar.

This proposal collapses the three entries into a single collapsible "Unidades" group, mirroring the existing pattern. It is intentionally a UI-only change: routes, endpoints, and screen behavior are unchanged.

## What Changes

- In `MaintainerLayout.tsx`, replace the three top-level entries with a single collapsible "Unidades" group containing three children:
  - "Magnitudes" → `Routes.ADMIN_MAGNITUDES`
  - "Unidades de medida" → `Routes.ADMIN_UNITS` (renamed from "Unidades")
  - "Tasas" → `Routes.ADMIN_RATE_MEASUREMENT_UNITS`
- The collapsible group SHALL follow the exact pattern used by the existing "Metodologías" group: same icon family, same expand/collapse animation, same active-child highlighting (the parent group expands automatically when any child route is active).
- The order of children inside the group SHALL be: Magnitudes, Unidades de medida, Tasas — reflecting the natural hierarchy (a magnitude defines the dimension; a unit of measure belongs to a magnitude; a rate is derived from two units).
- The group SHALL be visible to both `ADMIN` and `SUPERADMIN` users; individual children continue to apply their own role guards on the route side (Magnitudes and Unidades de medida open to both; Tasas remains SUPERADMIN-only).

## Capabilities

### Modified Capabilities

- `measurement-units-maintainer-screen`: The screen's sidebar entry SHALL render as a child of the new "Unidades" group with the label "Unidades de medida" (renamed from "Unidades").
- `magnitudes-maintainer-screen`: The screen's sidebar entry SHALL render as a child of the new "Unidades" group.
- `rate-measurement-units-screen`: The screen's sidebar entry SHALL render as a child of the new "Unidades" group.

## Impact

- **Database**: None.
- **API**: None.
- **Types**: None.
- **Frontend**: Single-file change to `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`. No new components. No new routes (the routes already exist after the prior two changes).
- **Tests**: A small visual / smoke test step ensuring the group expands when any child route is active and collapses correctly otherwise.
- **Dependencies**: Requires both `add-magnitudes-maintainer` and `add-rate-measurement-units-screen` to be merged first (this change references `Routes.ADMIN_MAGNITUDES` and `Routes.ADMIN_RATE_MEASUREMENT_UNITS`).
