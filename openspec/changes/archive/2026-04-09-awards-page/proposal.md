## Why

Organizations have no consolidated view of the recognition seals they've earned through approved carbon inventory submissions. This makes it hard to track and showcase their environmental credentials across years.

## What Changes

- New `/app/awards` route and screen showing earned seals per organization
- Header with year selector (showing the latest <CALCULATOR_YEARS_RANGE_FROM_CURRENT constant> years) and organization selector for filtering (options fetched from the current getMyOrganizationsSelectorOptions endpoint)
- Summary section with count cards per badge type (Reconocimiento de Medición, Reconocimiento de Verificación, Reconocimiento de Reducción, Reconocimiento de Neutralización), each card showing a preview of the seal image
- Data table listing each earned seal with columns: Fecha otorgado, Año medición, Reconocimiento, Huella tCO₂e, Estado, Acciones
- Action button per row opens a modal previewing the recognition diploma (uploaded by admin during approval, stored as `SubmissionFile` with type `RECOGNITION`)
- Table sorted by Año medición then badge type; uses existing `StylizedDatagrid` with sorting enabled
- Three new API endpoints:
  - `GET /organizations/:id/badges?year=` — aggregated seal data for the table and summary card counts
  - `GET /badges/previews` — signed SAS URLs for each active badge type's seal image (displayed on summary cards; not org-scoped since badges are global)
  - `GET /submissions/:id/recognition-file` — signed SAS URL for the recognition diploma attached to a specific submission (displayed in the row detail modal)

## Capabilities

### New Capabilities

- `get-organization-badges`: API endpoint that aggregates earned badges for an organization across all approved submissions, returning earning date, measurement year, badge type, total emissions, submission ID, and submission status. Accepts an optional `year` query parameter to filter by measurement year.
- `get-badge-previews`: API endpoint that returns signed SAS URLs for each active badge type's seal image (not org-scoped — badges are global), used to display seal previews on the summary cards.
- `get-submission-recognition-file`: API endpoint that returns the signed SAS URL for the recognition diploma (`SubmissionFile` with type `RECOGNITION`) attached to a given submission, used for the row detail preview modal.
- `awards-page`: Frontend screen at `/app/awards` with organization/year filters, summary cards with seal image previews, and a sortable seal table with a recognition diploma preview modal

### Modified Capabilities

<!-- No existing spec requirements are changing -->

## Impact

- **API**: New feature folders `apps/api/src/features/organizations/getOrganizationBadges/` (route, handler, service), `apps/api/src/features/badges/getBadgePreviews/` (route, handler, service), and `apps/api/src/features/submissions/getSubmissionRecognitionFile/` (route, handler, service)
- **Types**: New schemas in `packages/types/src/organizations/getOrganizationBadges/`, `packages/types/src/badges/getBadgePreviews/`, and `packages/types/src/submissions/getSubmissionRecognitionFile/`
- **Web**: New screen `apps/web/src/screens/Awards/`, three new query hooks, new route in the app router
- **Database**: Read-only — queries existing `Badge`, `Submission`, `SubmissionSubject`, `SubmissionFile`, `File`, `CarbonInventory`, and `CarbonInventorySubtotalsView` via Prisma
