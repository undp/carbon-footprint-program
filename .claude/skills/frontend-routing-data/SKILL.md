---
name: frontend-routing-data
description: Frontend routing and server-state for apps/web (TanStack Router + Query v5). Use when adding routes, route guards, or data fetching — file-based routing, beforeLoad guards, layout routes, query/mutation hooks under api/query, query-key factories for cache invalidation, and the ky apiClient.
---

# Frontend Routing & Data Fetching

- **Router**: TanStack Router with file-based routing in `apps/web/src/routes/`. The file `routeTree.gen.ts` is auto-generated — never edit it manually.
- **Route guards**: use `beforeLoad` in route definitions for auth checks and redirects.
- **Layout routes**: `app.tsx` and `admin.tsx` serve as layout wrappers for nested routes.
- **Server state**: TanStack Query v5. Both query and mutation hooks live in `apps/web/src/api/query/`, organized by domain (e.g., `query/organizations/`, `query/carbonInventories/`).
- **Query key factories**: each domain defines a keys file (e.g., `api/query/organizations/keys.ts`) with a structured key object (`organizationKeys.all`, `.detail(id)`, `.users(orgId)`). Use these for cache invalidation.
- **HTTP client**: `ky` via `apiClient` in `apps/web/src/api/http/client.ts`. Auth tokens are injected automatically in a `beforeRequest` hook via MSAL.
- **Empty-body mutations**: `ky`'s `.json()` throws on an empty response body. For soft-delete / 204-style mutations (e.g. handlers built with `createDeleteHandler` / `z.null` responses) use `.then(() => null)` instead of `.json()`.
