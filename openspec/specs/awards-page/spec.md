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

Whether the organization has recognitions SHALL be decided from its earned recognitions (the `getOrganizationRecognitions` response for the surfaced types), not from the display status of its footprints.

#### Scenario: User navigates to /app/recognitions

- **WHEN** a user navigates to `/app/recognitions`
- **THEN** the Recognitions screen is rendered with the header, summary cards, and table

#### Scenario: User has no organizations

- **WHEN** the authenticated user has no organizations
- **THEN** the screen shows an empty state prompting the user to create their first organization instead of the table

#### Scenario: Organization has no earned recognitions

- **WHEN** the selected organization has no earned recognitions of the surfaced types
- **THEN** the screen keeps the header with the organization and year selectors, and shows, in place of the summary cards and table, an empty state prompting the user to manage their footprints

#### Scenario: Leaving an organization without recognitions

- **WHEN** the empty state is shown for the selected organization and the user picks another organization in the header
- **THEN** the screen shows the recognitions of the newly selected organization without reloading the page

#### Scenario: Data still loading

- **WHEN** the organizations or the selected organization's recognitions are still loading
- **THEN** the screen does not show the no-recognitions empty state

#### Scenario: Recognitions request fails

- **WHEN** the request for the selected organization's recognitions fails
- **THEN** the screen does not show the no-recognitions empty state and shows the error snackbar "Error al cargar los reconocimientos"

#### Scenario: Only a self-declared footprint

- **WHEN** the organization's only recognition is the automatic measurement recognition of a self-declared footprint (`CARBON_INVENTORY_CALCULATION` submission in `APPROVED_AUTOMATICALLY`)
- **THEN** the screen does not show the empty state, and the table and the "Reconocimientos de Medición" card include that recognition

#### Scenario: Measurement recognition with a later verification in progress or rejected

- **WHEN** a footprint holds an approved measurement recognition and its verification postulation is pending, has observations, or was rejected
- **THEN** the screen lists the measurement recognition

#### Scenario: Footprint without any approved submission

- **WHEN** a footprint is a draft, or its only postulation was rejected
- **THEN** the footprint contributes no rows, no card counts and no year

### Requirement: Organization and year selectors

The page SHALL display an organization selector and a year selector in the header. The organization selector SHALL default to the user's first organization. The year selector SHALL default to all years ("Todos").

Changing the organization SHALL fetch the recognitions of the newly selected organization across all years. Changing the year SHALL filter the already-fetched recognitions by measurement year, without a new request, and update both the table and the summary cards.

The available years SHALL be the distinct measurement years of the organization's earned recognitions, in descending order, including the years of reduction-project recognitions.

Changing the organization SHALL reset the year selector to all years ("Todos"). When the selected year is not among the selected organization's available years (for example, after a refetch no longer returns it), the page SHALL behave as if all years were selected and the year selector SHALL show "Todos".

#### Scenario: Changing organization

- **WHEN** the user selects a different organization
- **THEN** the page fetches and displays recognitions for the new organization

#### Scenario: Filtering by year

- **WHEN** the user selects a specific year
- **THEN** the table and summary cards show only the recognitions whose measurement year matches it

#### Scenario: Years come from earned recognitions

- **WHEN** the organization has recognitions with measurement years 2026, 2025 and 2025
- **THEN** the year selector offers "Todos", 2026 and 2025, in that order

#### Scenario: Reduction-project year without an approved footprint

- **WHEN** the organization has a reduction-project recognition in a year with no approved footprint
- **THEN** that year is offered in the year selector

#### Scenario: Changing organization resets the year

- **WHEN** the user has selected 2025 and switches to another organization, including one that has recognitions in 2025
- **THEN** the year selector shows "Todos" and the table lists all the recognitions of the new organization

#### Scenario: Selected year no longer returned

- **WHEN** the user has selected 2025 and a refetch of the same organization no longer returns recognitions in 2025
- **THEN** the year selector shows "Todos" and the table lists the remaining recognitions

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
