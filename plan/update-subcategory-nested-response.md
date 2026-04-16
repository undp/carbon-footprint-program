# Update consumers of `GetReductionProjectByIdResponseSchema`

## Context

`packages/types/src/reductionProjects/getReductionProjectById/schemas.ts` was edited so the response now omits the flat `subcategoryId` field and exposes a nested `subcategory: { id, name }` object (picked from `SubcategoryBaseSchema`). The rest of the consuming code still reads/writes `subcategoryId`, so the API mapper, the backend Prisma include, the web form mapper, and the integration test must be updated so types compile and runtime data matches the new shape.

The frontend **form** keeps using a flat `subcategoryId` string (it's what the mutation endpoint still expects) — only the read path from the API response changes.

## Changes

### 1. Backend — include subcategory in Prisma query

**File:** `apps/api/src/features/reductionProjects/getReductionProjectById/service.ts:17-33`

Extend the existing `include` to fetch the subcategory:

```ts
include: {
  subcategory: { select: { id: true, name: true } },
  submission: { /* unchanged */ },
}
```

### 2. Backend — reshape mapper output

**File:** `apps/api/src/features/reductionProjects/mappers.ts:11-36`

- Widen the `row` param type so TypeScript knows `subcategory` is included (e.g. `Prisma.ReductionProjectGetPayload<{ include: { subcategory: { select: { id: true; name: true } } } }>`).
- Replace line 21 (`subcategoryId: row.subcategoryId.toString()`) with:
  ```ts
  subcategory: {
    id: row.subcategory.id.toString(),
    name: row.subcategory.name,
  },
  ```
- Propagate the narrower payload type to `mapReductionProjectToGetByIdResponse` (line 38-46) so the service call still type-checks.

### 3. Frontend — read nested subcategory in form mapper

**File:** `apps/web/src/screens/ReductionProject/mappers.ts:15`

Change `subcategoryId: project.subcategoryId ?? ""` → `subcategoryId: project.subcategory?.id ?? ""`.

No other changes in `ReductionProject/` are needed: `formSchema.ts`, `useReductionProjectForm.ts`, and `ReductionProjectFormFields.tsx` all operate on the flat form field `subcategoryId`, which is still correct for the mutation side.

### 4. Integration test — assert nested shape

**File:** `apps/api/test/features/reductionProjects/getReductionProjectById/integration.test.ts:70`

Replace `expect(body.subcategoryId).toBe(subcategory.id.toString());` with:

```ts
expect(body.subcategory).toEqual({
  id: subcategory.id.toString(),
  name: subcategory.name,
});
```

## Verification

- `pnpm type-check` — must pass (confirms mapper payload type and web mapper align).
- `pnpm lint`.
- `pnpm test --filter=api -- /getReductionProjectById/integration.test.ts --coverage=false` — must pass with updated assertion.
- Manual: open a reduction project in the web app edit screen and confirm the subcategory selector is pre-populated correctly (exercises `mapProjectToFormValues`).

## Files touched

- `apps/api/src/features/reductionProjects/getReductionProjectById/service.ts`
- `apps/api/src/features/reductionProjects/mappers.ts`
- `apps/web/src/screens/ReductionProject/mappers.ts`
- `apps/api/test/features/reductionProjects/getReductionProjectById/integration.test.ts`
