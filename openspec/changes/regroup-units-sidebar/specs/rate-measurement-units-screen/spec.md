## MODIFIED Requirements

### Requirement: Sidebar entry lives under the "Unidades" group

`MaintainerLayout.tsx` SHALL render the entry for `/admin/rate-measurement-units` as a child of a collapsible "Unidades" group (alongside "Magnitudes" and "Unidades de medida"), with the leaf label "Tasas" — replacing the prior top-level entry labelled "Tasas".

The route path (`/admin/rate-measurement-units`) and the route constant (`Routes.ADMIN_RATE_MEASUREMENT_UNITS`) SHALL be unchanged. The route's existing `beforeLoad` role guard (`[SUPERADMIN]`) SHALL be unchanged. The group itself SHALL be visible to any user reaching the admin layout; non-SUPERADMIN users who click "Tasas" continue to be redirected by the route's own guard.

#### Scenario: Sidebar surfaces the entry under the group

- **WHEN** a SUPERADMIN user opens the sidebar and expands the "Unidades" group
- **THEN** a child entry "Tasas" SHALL be visible, linking to `Routes.ADMIN_RATE_MEASUREMENT_UNITS`, rendered as the third (last) child in the group

#### Scenario: Auto-expand when active

- **WHEN** the user navigates to `/admin/rate-measurement-units`
- **THEN** the "Unidades" parent group SHALL render in its expanded state and the "Tasas" child SHALL render with the active-child highlight

#### Scenario: Group remains visible for non-SUPERADMIN admins

- **WHEN** a user with system role `ADMIN` opens the sidebar
- **THEN** the "Unidades" group and the "Tasas" child SHALL still be rendered (consistent with the existing pattern where role enforcement happens at the route level, not the sidebar level); clicking "Tasas" SHALL trigger the route's `beforeLoad` redirect
