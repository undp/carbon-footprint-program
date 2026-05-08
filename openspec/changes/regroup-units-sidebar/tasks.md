## 1. Frontend — Sidebar Restructure

- [ ] 1.1 In `apps/web/src/screens/Maintainer/layout/MaintainerLayout.tsx`, locate the three top-level entries currently linked to `Routes.ADMIN_MAGNITUDES`, `Routes.ADMIN_UNITS`, and `Routes.ADMIN_RATE_MEASUREMENT_UNITS`.
- [ ] 1.2 Remove the three top-level entries.
- [ ] 1.3 Add a new collapsible "Unidades" group, mirroring the implementation pattern of the existing "Metodologías" group (same wrapper component, same icon family, same active-child highlight logic). The group SHALL contain three children, in this order:
  - "Magnitudes" → `Routes.ADMIN_MAGNITUDES`
  - "Unidades de medida" → `Routes.ADMIN_UNITS`
  - "Tasas" → `Routes.ADMIN_RATE_MEASUREMENT_UNITS`
- [ ] 1.4 The group SHALL auto-expand when the current route matches any child, reusing whatever active-child detection the "Metodologías" group already uses.
- [ ] 1.5 The group SHALL be visible to any user reaching the admin layout (no role guard at the group level). Children retain their existing route-level `beforeLoad` role guards.
- [ ] 1.6 Choose an icon for the "Unidades" group consistent with the icon family used by "Metodologías" and "Perfilamiento". A `StraightenOutlined` or `BalanceOutlined` from MUI fits the unit-measurement theme; pick the one that already appears elsewhere in the app, or the closest match.

## 2. Frontend — Screen Title Polish (optional)

- [ ] 2.1 If the `MeasurementUnitsScreen` page header currently reads "Unidades", consider renaming it to "Unidades de medida" so the page header matches the sidebar label. This is cosmetic and may be skipped if the existing title is preferred.

## 3. Documentation

- [ ] 3.1 Grep `docs/` and any in-repo Markdown for the literal string "Unidades" used as a sidebar label or screen reference. Update any stale references to "Unidades de medida" where the context is the leaf maintainer.
- [ ] 3.2 If any project documentation enumerates the admin sidebar structure, update it to reflect the new "Unidades" group with its three children.

## 4. Pre-merge Checks

- [ ] 4.1 `pnpm format`
- [ ] 4.2 `pnpm lint`
- [ ] 4.3 `pnpm type-check`
- [ ] 4.4 Manual smoke test in the dev server:
  - Open the admin layout. Verify the "Unidades" group is visible adjacent to "Metodologías" and "Perfilamiento".
  - Click the group header. Verify it expands to show three children in order: Magnitudes, Unidades de medida, Tasas.
  - Click "Magnitudes". Verify the route navigates to `/admin/magnitudes`, the parent group remains expanded, and the active-child highlight applies.
  - Repeat for "Unidades de medida" and "Tasas".
  - Refresh the browser while on `/admin/magnitudes`. Verify the parent group renders in its expanded state on first paint (auto-expand works).
  - Navigate to a route outside the group (e.g., `/admin/methodologies`). Verify the "Unidades" group collapses (or remains in whatever default-collapsed state matches the other groups).
