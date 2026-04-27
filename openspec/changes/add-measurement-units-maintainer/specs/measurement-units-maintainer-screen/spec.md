## ADDED Requirements

### Requirement: Admin units route renders the maintainer screen

The route `/admin/units` SHALL render `MeasurementUnitsScreen` instead of `UnderConstructionScreen`. The route's `beforeLoad` guard SHALL allow users with system role `SUPERADMIN` or `ADMIN`, and SHALL redirect any other authenticated user to `Routes.ADMIN_DASHBOARD`.

#### Scenario: SUPERADMIN navigates to /admin/units

- **WHEN** a user with system role `SUPERADMIN` navigates to `/admin/units`
- **THEN** the router SHALL render `MeasurementUnitsScreen`

#### Scenario: ADMIN navigates to /admin/units

- **WHEN** a user with system role `ADMIN` navigates to `/admin/units`
- **THEN** the router SHALL render `MeasurementUnitsScreen`

#### Scenario: Regular user navigates to /admin/units

- **WHEN** a user with system role `USER` navigates to `/admin/units`
- **THEN** the router SHALL redirect to `Routes.ADMIN_DASHBOARD`

### Requirement: Screen uses StylizedDataGrid with native filtering and sorting

The screen SHALL render a single `StylizedDataGrid` with one row per active measurement unit. Native column filtering and sorting SHALL be enabled. The default sort model SHALL be `(magnitude ASC, name ASC)`.

#### Scenario: Initial render

- **WHEN** the screen mounts and the list endpoint resolves
- **THEN** the grid SHALL display rows ordered first by `magnitude` ascending, then by `name` ascending

#### Scenario: Native column filtering

- **WHEN** the admin opens the column header menu and applies a filter on `magnitude`
- **THEN** the grid SHALL filter visible rows in-place using the DataGrid's native filter implementation, with no custom filter UI

### Requirement: Inline editing mirrors CategoriesMaintainerScreen

Each row SHALL toggle between view and edit modes. New rows SHALL use a temporary id of the form `temp_<timestamp>` until persisted by the create endpoint. The screen SHALL block navigation when there are unsaved changes by using TanStack Router's `useBlocker`.

#### Scenario: Adding a new row

- **WHEN** the admin clicks "Add unit"
- **THEN** the grid SHALL prepend an editable row with a temp id; the row SHALL transition to a real persisted id after the create mutation succeeds

#### Scenario: Unsaved changes block navigation

- **WHEN** the admin has at least one row in dirty state and attempts to navigate away from the screen
- **THEN** the screen SHALL show a confirmation dialog before allowing navigation

### Requirement: Locked rows disable physical-field cells

For any row whose `referenceCount > 0`, the cells for `magnitude`, `baseFactor`, and `isBase` SHALL be non-editable. The cells for `name` and `abbreviation` SHALL remain editable.

#### Scenario: Editing a referenced unit

- **WHEN** the admin enters edit mode on a row with `referenceCount > 0`
- **THEN** the `magnitude`, `baseFactor`, and `isBase` cells SHALL be disabled and SHALL show a tooltip explaining that the unit is in use; the `name` and `abbreviation` cells SHALL be editable

#### Scenario: Editing an unreferenced unit

- **WHEN** the admin enters edit mode on a row with `referenceCount = 0`
- **THEN** all five fields (`name`, `abbreviation`, `magnitude`, `baseFactor`, `isBase`) SHALL be editable

### Requirement: System-protected rows hide modification controls

The screen SHALL hide the edit and delete actions on the row whose `abbreviation === "kg"` and on every row whose `isBase === true`. Each protected row SHALL render an info indicator with a tooltip explaining the protection.

#### Scenario: kg row controls hidden

- **WHEN** the grid renders the row with `abbreviation = "kg"`
- **THEN** the row SHALL not display edit or delete actions; an info indicator SHALL communicate that the unit is system-protected

#### Scenario: Base unit controls hidden

- **WHEN** the grid renders any row with `isBase = true`
- **THEN** the row SHALL not display edit or delete actions; an info indicator SHALL communicate that the unit is the base for its magnitude

### Requirement: Magnitude column displays Spanish labels via vocab

The `magnitude` column SHALL render values via the `MAGNITUDE_LABELS: Record<Magnitude, string>` constant defined in `apps/web/src/config/vocab.ts`. `MAGNITUDE_LABELS` SHALL include a Spanish label for every member of the `Magnitude` enum as defined in `packages/database/src/prisma/schema.prisma` (and re-exported from `@repo/types`); the keys of `MAGNITUDE_LABELS` SHALL exactly match the enum members so that TypeScript's `Record<Magnitude, string>` type prevents omissions at compile time. The mapping SHALL be:

- `MASS` → "Masa"
- `VOLUME` → "Volumen"
- `DISTANCE` → "Distancia"
- `TIME` → "Tiempo"
- `ANIMALS` → "Animales"
- `AREA` → "Área"
- `POWER` → "Potencia"
- `ENERGY` → "Energía"
- `DISTANCE_MASS` → "Distancia · Masa"
- `ROOMS` → "Habitaciones"

If a new value is added to the `Magnitude` enum in the future, `MAGNITUDE_LABELS` MUST be updated to include a Spanish label for it (a missing key will fail type-check via the `Record<Magnitude, string>` constraint).

#### Scenario: Spanish label rendering

- **WHEN** the grid renders a row whose `magnitude = "MASS"`
- **THEN** the cell SHALL display `MAGNITUDE_LABELS["MASS"]` (i.e., "Masa") rather than the raw enum value

#### Scenario: Full enum coverage enforced at compile time

- **WHEN** a developer adds a new value to the `Magnitude` enum without extending `MAGNITUDE_LABELS`
- **THEN** `pnpm type-check` SHALL fail because `MAGNITUDE_LABELS` is typed as `Record<Magnitude, string>` and the new key is missing

### Requirement: Restored-unit confirmation surfaces in the UI

When the create endpoint returns an action discriminator of `"restored-full"` or `"restored-labels"`, the screen SHALL show a contextual snackbar message indicating that an existing soft-deleted unit was restored rather than newly inserted. When the action is `"created"`, the snackbar SHALL show the standard creation confirmation.

#### Scenario: Restoring a previously deleted abbreviation

- **WHEN** the admin creates a row whose abbreviation matches a soft-deleted unit, and the API returns action `"restored-full"` or `"restored-labels"`
- **THEN** the screen SHALL show a snackbar message in Spanish indicating that the unit was restored

#### Scenario: Creating a brand-new abbreviation

- **WHEN** the admin creates a row whose abbreviation does not match any existing unit, and the API returns action `"created"`
- **THEN** the screen SHALL show the standard creation success snackbar

### Requirement: Spanish UI text throughout

All user-facing text on the screen — column headers, button labels, action labels, tooltips, error snackbars, confirmation dialogs — SHALL be in Spanish. API error codes SHALL be translated via `getApiErrorMessage` (extended to cover the new error codes added by the management capability).

#### Scenario: API error renders Spanish message

- **WHEN** any mutation fails with an API error code introduced by this change (e.g., `MeasurementUnitFieldsLockedError`, `BaseUnitImmutableError`)
- **THEN** the screen SHALL display the localized Spanish message returned by `getApiErrorMessage` for that code
