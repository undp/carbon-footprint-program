## 1. Remove requestReductionProjectVerification

- [x] 1.1 Delete `apps/api/src/features/reductionProjects/requestReductionProjectVerification/` directory
- [x] 1.2 Remove the `POST /:id/request-verification` route registration from `apps/api/src/routes/api/reduction-projects/index.ts`
- [x] 1.3 Delete `packages/types/src/reductionProjects/requestReductionProjectVerification/` directory
- [x] 1.4 Remove the `requestReductionProjectVerification` export from `packages/types/src/reductionProjects/index.ts`
- [x] 1.5 Delete the frontend hook/mutation that called `request-verification`
- [x] 1.6 Remove the frontend button/handler that invoked the two-step flow

## 2. Shared Mutation Schema

- [x] 2.1 Create `packages/types/src/reductionProjects/schemas.ts` with `ReductionProjectMutationDataSchema` containing all content fields (name, organizationId, carbonInventoryId, implementationDate, description, subcategoryId, gwpUsed, useNationalGwp, consideredGei, reportedElsewhere, reportedElsewhereDescription, year, baselineScenario, projectScenario)
- [x] 2.2 Rewrite `packages/types/src/reductionProjects/createReductionProject/`: `CreateReductionProjectRequestSchema` = `ReductionProjectMutationDataSchema` + required non-empty `fileUuids: string[]`; response remains `{ id: string }`
- [x] 2.3 Rewrite `packages/types/src/reductionProjects/updateReductionProject/`: `UpdateReductionProjectRequestSchema` = `ReductionProjectMutationDataSchema` (all fields) + required non-empty `fileUuids: string[]`
- [x] 2.4 Export `ReductionProjectMutationDataSchema` and its inferred type from the types package barrel

## 3. Modify createReductionProject Backend

- [x] 3.1 Inline org association + accreditation + carbon inventory approved-submission validation into `createReductionProject/service.ts`; wrap create + `createReductionProjectSubmission` + `linkFilesToSubmission` in a Prisma transaction
- [x] 3.2 Call `cleanupSourceBlobs()` after the transaction commits successfully
- [x] 3.3 Update `createReductionProject/handler.ts` to pass all new request body fields to the service
- [x] 3.4 Verify `updateReductionProject` service REVIEWED + fileUuids path creates a new submission (read-only verify, no changes expected)
- [x] 3.5 Verify route preHandler authorization is unchanged (CONTRIBUTOR, ADMIN)
- [x] 3.6 Remove `canRequestReductionProjectVerification` from `helpers.ts` once confirmed no other callers

## 4. Guard updateReductionProject

- [x] 4.1 Add validation to reject PATCH if display status is `DRAFT` (new `ReductionProjectDraftNotUpdatableError`)
- [x] 4.2 Add validation to reject PATCH with error if display status is `SUBMITTED` or `APPROVED`
- [x] 4.3 Confirm REVIEWED + fileUuids path: updates project content fields AND creates a new `REDUCTION_PROJECT_VERIFICATION` submission; fix if needed

## 5. Frontend Create Route

- [x] 5.1 Add `/reduction-projects/new` route to the frontend router with same auth guards as list
- [x] 5.2 Update the "INGRESAR PROYECTO" button to navigate to `/reduction-projects/new` without making any API call
- [x] 5.3 Extend `ReductionProjectScreen` to detect "create mode"; in create mode: fields editable, file upload visible + required, submit calls `POST /reduction-projects/`, on success navigate to list

## 6. Frontend Status-Based Form States

- [x] 6.1 **SUBMITTED**: disable all form fields, hide file upload section, hide submit button
- [x] 6.2 **REVIEWED**: all fields editable, active empty file upload input (not pre-populated), submit calls `PATCH /reduction-projects/:id` with fields + fileUuids
- [x] 6.3 Add client-side validation for REVIEWED: at least one file required before submit
- [x] 6.4 **APPROVED**: same as SUBMITTED (fields disabled, file section hidden, submit hidden)
- [x] 6.5 Remove old condition that hid the file upload section; replace with new status-based logic

## 7. Validation & Cleanup

- [x] 7.1 Run `pnpm type-check` across the monorepo — confirm no residual references to removed types
- [x] 7.2 Run `pnpm lint` and fix any errors
- [ ] 7.3 Manually test create flow: button click → navigate (no API call) → fill form → attach file → submit → list shows SUBMITTED project
- [ ] 7.4 Manually test REVIEWED re-submission: open REVIEWED project → fields editable, file input empty → attach file → submit → transitions to SUBMITTED
- [ ] 7.5 Confirm `POST /reduction-projects/:id/request-verification` returns 404

## 8. Unify ReductionProject Screens

- [x] 8.1 Add `mode: 'create' | 'edit'` and `id?: string` props to `ReductionProjectScreen`
      (`apps/web/src/screens/ReductionProject/ReductionProjectScreen.tsx`)
- [x] 8.2 Update `useReductionProject` query to accept `id?: string`
      (`apps/web/src/api/query/reductionProjects/useReductionProject.ts`);
      already has `enabled: !!id`, just update the TypeScript signature
- [x] 8.3 Merge create-mode logic into unified `ReductionProjectScreen`: - `isLoading`/`hasError`: false in create mode, from project query in edit mode - Status chip: `{mode === 'edit' && status && <ReductionProjectStatusChip />}` - `FileUploadSection`: always rendered (disabled only when `isSubmitting`) - `isFormDisabled`: SUBMITTED or APPROVED status (create mode: always false) - Submit button label: `mode === 'create' ? "Ingresar Proyecto" : "Subir Cambios"` - Submit button: hidden only when `isFormDisabled`
- [x] 8.4 Unify submit hooks: extend `useReductionProjectSubmit` to accept
      `{ projectId?: string }` — no projectId → calls create mutation,
      projectId present → calls update mutation;
      success message: no projectId → "Proyecto creado exitosamente",
      with projectId → "Proyecto guardado exitosamente"
      (`apps/web/src/screens/ReductionProject/hooks/useReductionProjectSubmit.ts`)
- [x] 8.5 Update route files to pass props: - `new.tsx`: render `<ReductionProjectScreen mode="create" />` - `$id.tsx`: call `Route.useParams()` to get id, render `<ReductionProjectScreen mode="edit" id={id} />`
      (Note: `useParams({ from: Routes.REDUCTION_PROJECT })` must not be called inside the unified screen
      because `new.tsx` has no `:id` segment — pass id as a prop from the route file instead)
- [x] 8.6 Delete `apps/web/src/screens/ReductionProject/CreateReductionProjectScreen.tsx`
- [x] 8.7 Delete `apps/web/src/screens/ReductionProject/hooks/useCreateReductionProjectSubmit.ts`
- [x] 8.8 Remove `CreateReductionProjectScreen` export from
      `apps/web/src/screens/ReductionProject/index.ts`
- [x] 8.9 Run `pnpm type-check` and `pnpm lint`; fix any errors

## 9. Migrate fileUuids to ReductionProjectMutationDataSchema

- [x] 9.1 Add `fileUuids` field to `ReductionProjectMutationDataSchema`
      in `packages/types/src/reductionProjects/schemas.ts`:
      `ts
fileUuids: z.array(z.uuid()).min(1, "At least one file is required")
  .describe("UUIDs of pre-uploaded files to attach to the submission")
`
- [x] 9.2 Replace `CreateReductionProjectRequestSchema` with a type alias
      in `packages/types/src/reductionProjects/createReductionProject/schemas.ts`:
      `ts
export const CreateReductionProjectRequestSchema = ReductionProjectMutationDataSchema;
`
- [x] 9.3 Replace `UpdateReductionProjectRequestSchema` with a type alias
      in `packages/types/src/reductionProjects/updateReductionProject/schemas.ts`:
      `ts
export const UpdateReductionProjectRequestSchema = ReductionProjectMutationDataSchema;
`
- [x] 9.4 Update `mapFormValuesToMutationData` in `apps/web/src/screens/ReductionProject/mappers.ts`
      to accept `(data: ReductionProjectFormValues, fileUuids: string[]): ReductionProjectMutationData`
      and include `fileUuids` in the returned object
- [x] 9.5 Update the unified `useReductionProjectSubmit` hook (task 8.4) to pass `fileUuids`
      as the second argument to `mapFormValuesToMutationData` instead of spreading it separately
- [x] 9.6 Delete `openspec/changes/reduction-project-unified-submission/specs/reduction-project-files-display/spec.md`
      (SUBMITTED/APPROVED file display is a deferred future feature — will be a separate change)
- [x] 9.7 Run `pnpm type-check` and `pnpm lint`; fix any errors
