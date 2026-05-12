## MODIFIED Requirements

### Requirement: Sidebar entry lives under the "Unidades" group

`MaintainerLayout.tsx` SHALL render the entry for `/admin/magnitudes` as a child of a collapsible "Unidades" group (alongside "Unidades de medida" and "Tasas"), with the leaf label "Magnitudes" — replacing the prior top-level entry labelled "Magnitudes".

The route path (`/admin/magnitudes`) and the route constant (`Routes.ADMIN_MAGNITUDES`) SHALL be unchanged. The route's existing `beforeLoad` role guard (`[ADMIN, SUPERADMIN]`) SHALL be unchanged.

#### Scenario: Sidebar surfaces the entry under the group

- **WHEN** an admin user opens the sidebar and expands the "Unidades" group
- **THEN** a child entry "Magnitudes" SHALL be visible, linking to `Routes.ADMIN_MAGNITUDES`, rendered as the first child in the group

#### Scenario: Auto-expand when active

- **WHEN** the user navigates to `/admin/magnitudes`
- **THEN** the "Unidades" parent group SHALL render in its expanded state and the "Magnitudes" child SHALL render with the active-child highlight
