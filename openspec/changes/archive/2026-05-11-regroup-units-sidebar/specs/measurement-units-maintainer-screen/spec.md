## MODIFIED Requirements

### Requirement: Sidebar entry lives under the "Unidades" group as "Unidades de medida"

`MaintainerLayout.tsx` SHALL render the entry for `/admin/units` as a child of a collapsible "Unidades" group (alongside "Magnitudes" and "Tasas"), with the leaf label "Unidades de medida" — replacing the prior top-level entry labelled "Unidades".

The route path (`/admin/units`) and the route constant (`Routes.ADMIN_UNITS`) SHALL be unchanged. The route's existing `beforeLoad` role guard (`[ADMIN, SUPERADMIN]`) SHALL be unchanged.

#### Scenario: Sidebar surfaces the entry under the group

- **WHEN** an admin user opens the sidebar and expands the "Unidades" group
- **THEN** a child entry "Unidades de medida" SHALL be visible, linking to `Routes.ADMIN_UNITS`

#### Scenario: Auto-expand when active

- **WHEN** the user navigates to `/admin/units`
- **THEN** the "Unidades" parent group SHALL render in its expanded state and the "Unidades de medida" child SHALL render with the active-child highlight
