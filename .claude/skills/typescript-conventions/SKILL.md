---
name: TypeScript Conventions
description: TypeScript typing standards for this repo — strict typing, Prisma-generated types, Zod schemas centralized in packages/types, Fastify route schemas via fastify-type-provider-zod, enums for categorical values, and deriving frontend types from API responses. Use when writing or editing TypeScript types, Zod schemas, API contracts, or the packages/types structure.
when_to_use: Use when defining or changing types, adding a Zod schema for request/response/params/query, wiring a Fastify route schema, replacing hardcoded status/type strings, or deriving a component/helper type from an endpoint response.
---

# TypeScript Conventions

## Strict typing

- Explicitly type all constants, function parameters, return types, and variables.
- Avoid `any`.

## Use Prisma auto-generated types

When working with database models, filters, includes, or query arguments, always use Prisma-generated types (e.g. `Prisma.OrganizationWhereInput`, `Prisma.CarbonInventoryInclude`). Do not hand-write type definitions for things Prisma already provides.

## Zod schemas live in `packages/types`

All Zod schemas for API contracts must be defined in `packages/types` — schemas for route params, query params, request body, and response body. Export the inferred TypeScript types alongside each schema (e.g. `z.infer<typeof MySchema>`). Reuse these schemas and types in the API; **never redefine them locally**.

### `packages/types/src/` structure

Organized by domain (e.g. `organizations/`, `carbonInventories/`). Each domain contains:

- `schemas.ts` + `types.ts` at the domain root for shared schemas/types.
- `app/` and/or `admin/` subfolders to separate public and admin endpoints.
- Inside each subfolder, one directory per endpoint (e.g. `app/getOrganizationById/`) with its own `schemas.ts` and `types.ts`.
- An `index.ts` at each level re-exporting everything.

## Fastify route schema

Pass the Zod schemas directly to Fastify's `schema` option in `route.ts` via `fastify-type-provider-zod` (already configured in `app.ts`). This gives automatic request validation, response serialization, and Swagger docs:

```ts
schema: {
  params: MyParamsSchema,
  querystring: MyQuerySchema,
  body: MyBodySchema,
  response: { 200: MyResponseSchema },
}
```

## Use enums for status/type values

Always use TypeScript enums or Prisma-generated enums instead of hardcoded literal strings — e.g. `InventoryStatus.ACTIVE` instead of `"ACTIVE"`. Applies to all status fields, type discriminators, role values, and similar categorical strings.

## Derive types from endpoint responses

When a component, helper, or function uses fields from an API response, derive its types from the endpoint's response type — never define them manually. Use indexed access types (e.g. `GetOrganizationByIdResponse["members"][number]`) or utility types like `Pick` to extract the exact shape. This keeps types in sync with the API contract automatically.
