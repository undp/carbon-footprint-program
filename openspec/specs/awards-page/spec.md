# awards-page Specification

## Purpose

This capability provides the organization-facing Recognitions screen (originally conceived as an "awards page") at `/app/recognitions`, giving organizations a consolidated, cross-year view of the recognition seals they have earned through approved submissions. It renders an organization and year selector, summary cards counting earned recognitions per type with the corresponding seal image, and a sortable table of every earned recognition with access to its recognition file. All data comes from the `getOrganizationRecognitions` endpoint and the badge-previews endpoint; the screen is read-only.

## Requirements

### Requirement: Recognitions page route and layout

The system SHALL provide a screen at `/app/recognitions`, rendered by the `RecognitionsScreen` component, that displays the recognition seals earned by an organization.

The screen SHALL include:

- A header with an organization selector and a year selector
- A summary section with one card per surfaced recognition type showing the count of earned recognitions and the seal image
- A data table listing each earned recognition

#### Scenario: User navigates to /app/recognitions

- **WHEN** a user navigates to `/app/recognitions`
- **THEN** the Recognitions screen is rendered with the header, summary cards, and table

#### Scenario: User has no organizations

- **WHEN** the authenticated user has no organizations
- **THEN** the screen shows an empty state prompting the user to create their first organization instead of the table

#### Scenario: Organization has no recognized footprints

- **WHEN** the selected organization has no approved footprints that carry recognitions
- **THEN** the screen shows an empty state prompting the user to manage their footprints

### Requirement: Organization and year selectors

The page SHALL display an organization selector and a year selector in the header. The organization selector SHALL default to the user's first organization. The year selector SHALL default to all years. Changing either selector SHALL trigger a new fetch from `getOrganizationRecognitions` for the selected organization and year, updating both the table and the summary cards.

The available years SHALL be derived from the organization's approved carbon inventories.

#### Scenario: Changing organization

- **WHEN** the user selects a different organization
- **THEN** the page fetches and displays recognitions for the new organization

#### Scenario: Filtering by year

- **WHEN** the user selects a specific year
- **THEN** the page refetches recognitions filtered by that measurement year and updates the table and summary cards

### Requirement: Recognition summary cards

The page SHALL display one summary card per surfaced recognition submission type. The currently surfaced types are `CARBON_INVENTORY_CALCULATION`, `CARBON_INVENTORY_VERIFICATION`, and `REDUCTION_PROJECT_VERIFICATION`; the neutralization type is not currently surfaced. Each card SHALL show, in Spanish, the recognition-type label, the count of earned recognitions of that type matching the current filters, and the seal image for that type fetched from `GET /badges/previews`.

Recognition type to card label mapping:

- `CARBON_INVENTORY_CALCULATION` → "Reconocimientos de Medición"
- `CARBON_INVENTORY_VERIFICATION` → "Reconocimientos de Verificación"
- `REDUCTION_PROJECT_VERIFICATION` → "Reconocimientos de Reducción"

#### Scenario: Cards show counts and seal images

- **WHEN** the page loads for an organization with earned recognitions
- **THEN** each card shows the correct count for its type and the seal image from the badge-previews endpoint

#### Scenario: No recognitions for a type

- **WHEN** the organization has no recognitions of a given type under the current filters
- **THEN** the corresponding card shows "-" as its count

#### Scenario: Seal image unavailable

- **WHEN** no seal preview image is available for a card's type
- **THEN** the card renders a letter avatar fallback instead of the image

### Requirement: Recognitions table

The page SHALL display a sortable table using `StylizedDataGrid` listing each earned recognition with the following columns: "Fecha otorgado" (earning date), "Año medición" (measurement year), "Reconocimiento" (recognition type label), "Emisiones (tCO₂e)" (total emissions), and "Acciones".

Column sorting SHALL be enabled. The rows SHALL be ordered by measurement year descending, then by recognition type. The table SHALL only show recognitions from approved submissions.

#### Scenario: Table displays correct data

- **WHEN** the table is rendered with recognition data
- **THEN** each row shows the earning date, measurement year, recognition-type label, total emissions, and an action button

#### Scenario: Default sort order

- **WHEN** the table first loads
- **THEN** rows are ordered by measurement year descending, then by recognition type

### Requirement: Recognition file action

Each table row SHALL have an action button in the "Acciones" column that opens the recognition file for that row using its `recognitionFileUrl` (a signed SAS URL) in a new browser tab. When the row has no recognition file (`recognitionFileUrl` is null), the button SHALL be disabled and show the tooltip "No hay un archivo disponible".

#### Scenario: Row has a recognition file

- **WHEN** the user clicks the action button on a row whose `recognitionFileUrl` is present
- **THEN** the recognition file opens in a new browser tab

#### Scenario: Row has no recognition file

- **WHEN** a row's `recognitionFileUrl` is null
- **THEN** the action button is disabled and shows the tooltip "No hay un archivo disponible"
