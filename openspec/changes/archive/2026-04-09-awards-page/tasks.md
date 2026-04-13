## 1. API Types — getOrganizationBadges (packages/types)

- [ ] 1.1 Create `packages/types/src/organizations/getOrganizationBadges/schemas.ts` with `GetOrganizationBadgesParamsSchema` (id path param), `GetOrganizationBadgesQuerySchema` (optional `year` query param), `GetOrganizationBadgesResponseSchema` (array of items with `submissionId`, `earningDate`, `measurementYear`, `badgeType`, `totalEmissions`, `status`)
- [ ] 1.2 Create `packages/types/src/organizations/getOrganizationBadges/types.ts` exporting inferred types
- [ ] 1.3 Export from `packages/types/src/organizations/index.ts`

## 2. API Types — getBadgePreviews (packages/types)

- [ ] 2.1 Create `packages/types/src/badges/getBadgePreviews/schemas.ts` with `GetBadgePreviewsResponseSchema` (array of items with `badgeType`, `previewUrl`)
- [ ] 2.2 Create `packages/types/src/badges/getBadgePreviews/types.ts` exporting inferred types
- [ ] 2.3 Create and export from `packages/types/src/badges/index.ts`

## 3. API Types — getSubmissionRecognitionFile (packages/types)

- [ ] 3.1 Create `packages/types/src/submissions/getSubmissionRecognitionFile/schemas.ts` with `GetSubmissionRecognitionFileParamsSchema` (id path param), `GetSubmissionRecognitionFileResponseSchema` (object with `previewUrl`, `originalName`, `mimeType`)
- [ ] 3.2 Create `packages/types/src/submissions/getSubmissionRecognitionFile/types.ts` exporting inferred types
- [ ] 3.3 Export from `packages/types/src/submissions/index.ts`

## 4. API Endpoint — getOrganizationBadges (apps/api)

- [ ] 4.1 Create `apps/api/src/features/organizations/getOrganizationBadges/route.ts` registering `GET /:id/badges`
- [ ] 4.2 Create `apps/api/src/features/organizations/getOrganizationBadges/handler.ts` parsing params and query, delegating to service
- [ ] 4.3 Create `apps/api/src/features/organizations/getOrganizationBadges/service.ts` that queries submissions with APPROVED status for the org's carbon inventories, joins Badge and CarbonInventory, sums `CarbonInventorySubtotalsView` values per inventory, filters by year if provided, excludes `ORGANIZATION_ACCREDITATION` type, returns 404 if org not found
- [ ] 4.4 Register the new route in the organizations feature index / router

## 5. API Endpoint — getBadgePreviews (apps/api)

- [ ] 5.1 Create `apps/api/src/features/badges/getBadgePreviews/route.ts` registering `GET /badges/previews`
- [ ] 5.2 Create `apps/api/src/features/badges/getBadgePreviews/handler.ts` extracting `blobServiceClient` and `storageContainerName` from server config, delegating to service
- [ ] 5.3 Create `apps/api/src/features/badges/getBadgePreviews/service.ts` that queries all active badges (excluding `ORGANIZATION_ACCREDITATION`), generates signed SAS preview URLs for each badge's file, returns array of `{ badgeType, previewUrl }`
- [ ] 5.4 Register the new route in the main app router under `/badges`

## 6. API Endpoint — getSubmissionRecognitionFile (apps/api)

- [ ] 6.1 Create `apps/api/src/features/submissions/getSubmissionRecognitionFile/route.ts` registering `GET /:id/recognition-file`
- [ ] 6.2 Create `apps/api/src/features/submissions/getSubmissionRecognitionFile/handler.ts` extracting `blobServiceClient` and `storageContainerName` from server config, delegating to service
- [ ] 6.3 Create `apps/api/src/features/submissions/getSubmissionRecognitionFile/service.ts` that queries `SubmissionFile` where `submissionId` matches and `type = RECOGNITION`, joins `File` to get `blobPath` and metadata, generates a signed SAS URL, returns 404 if no recognition file found
- [ ] 6.4 Register the new route in the submissions feature index / router

## 7. Frontend Query Hooks (apps/web)

- [ ] 7.1 Add `getOrganizationBadges` query key to `apps/web/src/api/query/organizations/keys.ts`
- [ ] 7.2 Create `apps/web/src/api/query/organizations/useOrganizationBadges.ts` hook using `apiClient.get('organizations/:id/badges')` with `year` query param support
- [ ] 7.3 Add `getBadgePreviews` query key and create `apps/web/src/api/query/badges/useBadgePreviews.ts` hook using `apiClient.get('badges/previews')`
- [ ] 7.4 Add `getSubmissionRecognitionFile` query key to `apps/web/src/api/query/submissions/keys.ts`
- [ ] 7.5 Create `apps/web/src/api/query/submissions/useSubmissionRecognitionFile.ts` hook using `apiClient.get('submissions/:id/recognition-file')`

## 8. Awards Screen (apps/web)

- [ ] 8.1 Create `apps/web/src/screens/Awards/AwardsScreen.tsx` with the page layout: header row (org name, year selector, org selector), summary cards section, and table section
- [ ] 8.2 Implement year selector (MUI FormControl + Select) with "Todos" default, deriving available years from fetched badge data
- [ ] 8.3 Implement organization selector reusing the existing `OrganizationSelector` component
- [ ] 8.4 Implement the four badge summary cards (`CARBON_INVENTORY_CALCULATION`, `CARBON_INVENTORY_VERIFICATION`, `REDUCTION_PROJECT_VERIFICATION`, `NEUTRALIZATION_PLAN_VERIFICATION`) showing count from badges data and seal image preview from badge previews endpoint, with labels: Diploma Medición, Sello Verificación, Sello Reducción, Sello Neutralización
- [ ] 8.5 Implement the recognitions table using `StylizedDatagrid` with `disableColumnSorting={false}` and columns: Fecha otorgado, Año medición, Reconocimiento, Huella tCO₂e, Estado, Acciones
- [ ] 8.6 Set default `sortModel` to `[{ field: 'measurementYear', sort: 'desc' }, { field: 'badgeType', sort: 'asc' }]`
- [ ] 8.7 Render the "Estado" column as a MUI Chip with green background for APPROVED ("OTORGADO")
- [ ] 8.8 Implement the action button per row (icon button) that opens a recognition diploma preview modal
- [ ] 8.9 Create the recognition diploma preview modal that fetches the signed URL via `useSubmissionRecognitionFile` for the selected row's `submissionId`, displays the diploma image/PDF, shows a "no diploma available" message if 404, includes a close button and a download button that fetches the file blob and triggers a browser download with the original file name
- [ ] 8.10 Wire up year filtering so changing the year selector refetches badges with the new year param, updating both table and summary card counts

## 9. Routing

- [ ] 9.1 Add the `/app/awards` route to the app router, rendering `AwardsScreen`
- [ ] 9.2 Verify the "Reconocimientos" nav item in the sidebar links to `/app/awards` (update href if needed)

## 10. Validation

- [ ] 10.1 Run `pnpm type-check` and fix any TypeScript errors
- [ ] 10.2 Run `pnpm lint` and fix any lint errors
