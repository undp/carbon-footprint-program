---
name: api-authorization
description: Authentication and authorization for apps/api. Use when adding access control to an API route — choosing between requireAuth, requireRoles (system roles), requireOrganizationRole (org-scoped roles), or the domain access hooks requireCarbonInventoryAccess / requireReductionProjectAccess, and wiring the right extractor in route.ts.
---

# Authentication & Authorization

Two-dimension role model. Apply the correct decorator in `route.ts`:

- **`fastify.requireAuth`** — onRequest hook; checks the user is authenticated. Use on all protected routes.
- **`fastify.requireRoles([SystemRole.ADMIN, ...])`** — onRequest hook; restricts by system-level roles (`USER`, `ADMIN`, `SUPERADMIN`).
- **`fastify.requireOrganizationRole(extractor, { allowedRoles, canAdminsBypass })`** — **preHandler** hook; restricts by organization-scoped roles (`VIEWER`, `CONTRIBUTOR`, `ADMIN`). Requires an `extractor` that pulls the organization ID from the request (params/body/query).
- **`fastify.requireCarbonInventoryAccess(extractor, { requiredOrganizationRoles, canAdminsBypass })`** — **preHandler** hook; checks access to a specific carbon inventory. Supports anonymous access via the `x-carbon-inventory-uuid` header, creator-only access for standalone inventories, and organization membership checks. Requires an extractor (e.g., `idRequestExtractor`).
- **`fastify.requireReductionProjectAccess({ requiredOrganizationRoles, canAdminsBypass })`** — **preHandler** hook; checks access to a reduction project via organization membership. Extracts the project ID from `request.params.id`. Supports admin bypass when `canAdminsBypass` is set.

Domain-specific access hooks (`requireCarbonInventoryAccess`, `requireReductionProjectAccess`) are only for endpoints within their own domain (carbon inventory endpoints, reduction project endpoints). Endpoints in other domains that reference these entities indirectly should rely on `requireOrganizationRole`.

Access the current user via `request.currentUser` (set by the `user-resolve-plugin` in preHandler).

Source: `apps/api/src/plugins/app/authorizationPlugin.ts`, `organizationAuthorizationPlugin.ts`, `carbonInventoryAuthorizationPlugin.ts`, `reductionProjectAuthorizationPlugin.ts`.
