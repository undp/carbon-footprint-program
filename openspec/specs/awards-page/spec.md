## Requirements

### Requirement: Awards page route and layout

The system SHALL provide a screen at `/app/awards` that displays earned recognition seals for organizations.

The screen SHALL include:

- A header with an "Año" (year) selector and an "Organizaciones" selector
- A summary section with one card per badge type showing the count of earned seals
- A data table listing each earned seal

#### Scenario: User navigates to /app/awards

- **WHEN** a user navigates to `/app/awards`
- **THEN** the awards page is rendered with the header, summary cards, and table

### Requirement: Organization and year selectors

The page SHALL display a year selector and an organization selector in the header. Selecting an organization SHALL trigger a new API fetch for that organization's badges. Selecting a year SHALL filter the already-fetched list client-side.

The organization selector SHALL default to the user's primary organization. The year selector SHALL default to "Todos" (all years).

#### Scenario: Changing organization

- **WHEN** the user selects a different organization
- **THEN** the page fetches and displays badges for the new organization

#### Scenario: Filtering by year

- **WHEN** the user selects a specific year
- **THEN** only badges with `measurementYear` matching the selection are shown in the table and summary cards

### Requirement: Badge summary cards

The page SHALL display four summary cards, one per badge type: Reconocimiento de Medición, Reconocimiento de Verificación, Reconocimiento de Reducción, Reconocimiento de Neutralización. Each card SHALL show the count of earned seals of that type matching the current filters.

Badge type to display label mapping:

- `CARBON_INVENTORY_CALCULATION` → "Diploma Medición"
- `CARBON_INVENTORY_VERIFICATION` → "Sello Verificación"
- `REDUCTION_PROJECT_VERIFICATION` → "Sello Reducción"
- `NEUTRALIZATION_PLAN_VERIFICATION` → "Sello Neutralización"

#### Scenario: All badge types represented

- **WHEN** the page loads with an organization that has badges of all types
- **THEN** each summary card shows the correct count for its type

#### Scenario: No badges for a type

- **WHEN** the organization has no badges of a given type
- **THEN** the corresponding card shows "–" or 0

### Requirement: Recognitions table

The page SHALL display a sortable table using `StylizedDatagrid` listing each earned seal with the following columns: Fecha otorgado, Año medición, Reconocimiento, Huella tCO₂e, Estado, Acciones.

The table SHALL be sorted by default by Año medición descending, then by badge type ascending.

Column sorting SHALL be enabled for all columns.

The table SHALL only show badges from approved submissions.

#### Scenario: Table displays correct data

- **WHEN** the table is rendered with badge data
- **THEN** each row shows earningDate, measurementYear, badgeType label, totalEmissions, status chip, and action button

#### Scenario: Default sort order

- **WHEN** the table first loads
- **THEN** rows are ordered by measurementYear descending, then badge type ascending

### Requirement: Status chip display

The `status` column SHALL render a styled chip. An APPROVED submission's status SHALL be displayed as "OTORGADO" with a green background chip.

#### Scenario: APPROVED status chip

- **WHEN** a badge row has status APPROVED
- **THEN** the chip shows "OTORGADO" with green background

### Requirement: Seal preview action

Each table row SHALL have an action button that opens a modal displaying a preview of the badge file using the `previewUrl` (signed SAS URL). The modal SHALL display the image and a close button.

#### Scenario: User clicks action button

- **WHEN** the user clicks the action button on a row
- **THEN** a modal opens showing a preview image of the badge

#### Scenario: Modal close

- **WHEN** the user clicks close or outside the modal
- **THEN** the modal dismisses
