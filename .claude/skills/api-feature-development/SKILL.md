---
name: API Feature Development
description: Standards for building and modifying backend API endpoints in apps/api — feature folder structure (route → handler → service → helpers), efficient Prisma usage, transactions, authentication/authorization decorators, and error handling. Use whenever creating, editing, or reviewing a Fastify route, handler, service, or any backend feature under apps/api/src/features.
when_to_use: Use when adding a new API endpoint, editing a route.ts/handler.ts/service.ts, choosing an auth decorator, writing Prisma queries, wrapping read-then-write logic in a transaction, throwing API errors, or placing backend helper functions.
---

# API Feature Development

Backend rules for the Fastify + Prisma API in `apps/api`. Follow these whenever you touch a backend feature.

## Feature structure

Every feature lives under `apps/api/src/features/<feature>/` and follows the pipeline:

```
route.ts  →  handler.ts  →  service.ts  (→ helpers.ts if needed)
```

- `route.ts`: declares the route, attaches the Zod `schema`, and applies auth hooks.
- `handler.ts`: thin glue between the request and the service.
- `service.ts`: business logic and database operations only.
- `helpers.ts`: feature-specific auxiliary/utility functions. **Do not** put helpers inside `service.ts`. Only promote a helper to the shared `apps/api/src/helpers/` directory once it is actually reused across features — never speculatively.

## Efficient database usage

Endpoints must be efficient and assume datasets grow over time. Apply these in order of preference:

1. **Push logic to the database**: use aggregations, filters, and calculations at the query level (`groupBy`, `count`, `_sum`, raw SQL when needed) instead of fetching raw rows and processing in memory.
2. **Parallelize independent queries**: use `Promise.all` or `prisma.$transaction` to run independent queries concurrently instead of sequentially.
3. **Avoid overfetching**: use `select` to retrieve only the fields you need.
4. **Use `include` wisely**: prefer a single query with `include` over multiple sequential queries, but only include relations that are actually needed.

## Transactions (avoid TOCTOU)

When an endpoint performs validations followed by updates (read-then-write), wrap them in a `prisma.$transaction` to avoid time-of-check-to-time-of-use race conditions. Use the **interactive** form so all reads and writes share the same transaction context:

```ts
await prisma.$transaction(async (tx) => {
  // reads + writes share tx
});
```

## Authentication & authorization

The API uses a two-dimension role model. Apply the correct hook in `route.ts`:

- **`fastify.requireAuth`** — onRequest hook; checks the user is authenticated. Use on all protected routes.
- **`fastify.requireRoles([SystemRole.ADMIN, ...])`** — onRequest hook; restricts by system-level roles (`USER`, `ADMIN`, `SUPERADMIN`).
- **`fastify.requireOrganizationRole(extractor, { allowedRoles, canAdminsBypass })`** — **preHandler** hook; restricts by organization-scoped roles (`VIEWER`, `CONTRIBUTOR`, `ADMIN`). Needs an `extractor` that pulls the organization ID from the request (params, body, or query).
- **`fastify.requireCarbonInventoryAccess(extractor, { requiredOrganizationRoles, canAdminsBypass })`** — **preHandler** hook; checks access to a specific carbon inventory. Supports anonymous access via the `x-carbon-inventory-uuid` header, creator-only access for standalone inventories, and organization membership checks. Needs an `extractor` (e.g. `idRequestExtractor`).
- **`fastify.requireReductionProjectAccess({ requiredOrganizationRoles, canAdminsBypass })`** — **preHandler** hook; checks access to a reduction project via organization membership. Extracts the project ID from `request.params.id`. Supports admin bypass via `canAdminsBypass`.

Rules:

- Domain-specific access hooks (`requireCarbonInventoryAccess`, `requireReductionProjectAccess`) are only used at endpoints **within their own domain**. Endpoints in other domains that reference these entities indirectly should rely on `requireOrganizationRole`.
- Access the current user via `request.currentUser` (set by `user-resolve-plugin` in preHandler).
- Source: `apps/api/src/plugins/app/authorizationPlugin.ts`, `organizationAuthorizationPlugin.ts`, `carbonInventoryAuthorizationPlugin.ts`, `reductionProjectAuthorizationPlugin.ts`.

## Error handling

- Throw the custom error classes from `apps/api/src/errors/` (e.g. `DataIntegrityError`, `EmptyResourceError`, `DatabaseUniqueConstraintViolationError`). Fastify's error-handler plugin catches them and normalizes the response. **Reuse the existing error classes** — the shared set covers not found, unique constraint violation, data integrity, empty resource, and config error. Do not define new feature-specific error classes.
- Use `ApiErrorResponseSchema` from `apps/api/src/commonSchemas/errors.ts` for error responses in route schemas (e.g. `response: { 404: ApiErrorResponseSchema }`).
- For Prisma unique-constraint violations, use helpers like `extractP2002Fields()` from `apps/api/src/errors/` to produce meaningful messages.

## Related skills

- Typing and Zod/contract rules: see the **TypeScript Conventions** skill.
- Tests for endpoints: see the **Integration Testing** skill.
