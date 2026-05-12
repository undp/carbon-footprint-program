# Route Access Modes

Every API route falls into one of three access modes. The mode is declared at registration time via two flags on the Fastify route `config`:

- `allowPublicAccess: true` — anyone can call it, no credentials checked.
- `allowAnonymousAccess: true` — callers may authenticate with a Bearer token **or** with an alternative credential (e.g. the `x-carbon-inventory-uuid` header). The route's own `preHandler` enforces the alternative credential.
- Neither flag set (default) — Bearer token required. The route is **private**.

This document is about the route-level access mode (what credentials the route accepts). For who can do what once authenticated, see [RBAC and Authorization](./rbac.md). For how identity is established, see [Authentication](./authentication.md).

---

## The Three Modes at a Glance

| Mode          | Config flag                  | Bearer required? | Alternative credential | Typical use case                                       |
| ------------- | ---------------------------- | ---------------- | ---------------------- | ------------------------------------------------------ |
| **Private**   | _(default — neither flag)_   | Yes              | —                      | Anything that operates on a specific user's data       |
| **Public**    | `allowPublicAccess: true`    | No               | None                   | Truly open content (T&C, transparency, explanations)   |
| **Anonymous** | `allowAnonymousAccess: true` | No               | Resource-scoped header | Calculator flow — operate on a specific inventory UUID |

The flags are declared per route, inside the `config` block:

```typescript
fastify.get(
  "/:id",
  {
    schema: { ... },
    config: {
      allowPublicAccess: options?.allowPublicAccess ?? false,
      allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
    },
    onRequest: [...],
    preHandler: [...],
  },
  handler,
);
```

Routes are registered through `StandardRouteSignature` (`apps/api/src/routes/api/index.ts`), so the caller in `routes/api/<group>/index.ts` opts a route into a non-default mode:

```typescript
createCarbonInventoryRoute(fastify, { allowPublicAccess: true });
getCarbonInventoryByIdRoute(fastify, { allowAnonymousAccess: true });
getMyOrganizationsRoute(fastify); // private (default)
```

---

## Private Routes (Default)

This is the default for every route. The expectation is: the caller is an authenticated platform user.

**How it works:**

1. `fastify.requireAuth` (registered as an `onRequest` hook) runs `authService.authenticate(request)`.
2. If authentication produces no user, the route returns **401 Unauthorized**.
3. `userResolvePlugin` upserts the user into the database and sets `request.currentUser`.
4. Any further role checks (`requireRoles`, `requireOrganizationRole`, `requireCarbonInventoryAccess`, …) run and may return **403 Forbidden**.

**Declaration:** do nothing. A route that omits both flags is private.

**When to use:** any endpoint that reads or writes user-specific data, organization-scoped data, or admin functionality.

---

## Public Routes (`allowPublicAccess: true`)

Public routes serve content that has no per-caller authorization concept. Anyone can call them with no headers or tokens.

**How it works:**

1. `requireAuth` still runs, but treats the missing user as fine — `request.authUser` is set only if a valid Bearer token happens to be present.
2. `requireRoles` short-circuits without checking the system role.
3. The handler runs.

**Result:** unauthenticated callers get a successful response. Authenticated callers get the same response — they are simply identifiable inside the handler if needed.

**Current callers** (`grep -r "allowPublicAccess: true"`):

| Route                          | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| `GET /explanations/:slug`      | Public explanations / help content                |
| `GET /transparency`            | Public transparency dashboard data                |
| `GET /terms-conditions`        | Current T&C metadata                              |
| `GET /terms-conditions/stream` | T&C file stream                                   |
| `POST /carbon-inventories`     | Calculator can create an inventory without signup |

**When to use:** the response does not depend on caller identity, and the data is content the platform intentionally publishes (legal docs, marketing copy, aggregated metrics). If even one branch of the handler needs an authenticated user, the route is **not** public — use either a private route or `allowAnonymousAccess`.

**Swagger behavior:** the route is documented with **no security scheme** — `security: []` (`apps/api/src/plugins/external/swagger.ts:37`).

---

## Anonymous-Allowed Routes (`allowAnonymousAccess: true`)

Anonymous-allowed routes accept either of two credentials:

- A standard Bearer token, **or**
- An alternative, resource-scoped credential — today, the `x-carbon-inventory-uuid` header.

The header carries a UUID that the route's own `preHandler` matches against a specific carbon inventory. The UUID acts as a capability token: holding it grants access to that inventory only, never to others, and only to a curated set of endpoints.

**How it works:**

1. `requireAuth` runs; it does not 401 when no Bearer is present, because the route opts out of mandatory auth.
2. `requireRoles` short-circuits — system roles aren't checked.
3. The route's own preHandler `fastify.requireCarbonInventoryAccess(extractor, …)` runs and:
   - Looks up the target inventory by the ID extracted from the route.
   - Reads `x-carbon-inventory-uuid` from the request headers.
   - If the header value matches the inventory's `uuid` column, access is granted.
   - Otherwise, the standard membership / creator checks apply (see [`requireCarbonInventoryAccess` in RBAC docs](./rbac.md#fastifyrequirecarboninventoryaccessextractor-options)).
4. The handler runs.

**Why this pattern exists:** the calculator flow lets a visitor create and edit a single inventory without signing up. The inventory's UUID is embedded in the URL the visitor uses; the frontend sends it back as a header so the API can authorize each request against that specific inventory.

**Hard rule — `requireCarbonInventoryAccess` is mandatory.** If a route is marked `allowAnonymousAccess: true` but does not register the `requireCarbonInventoryAccess` preHandler, it is effectively unauthenticated with no fallback authorization. That is a bug. `createCarbonInventory` is the only exception: it has no inventory yet to authorize against, and is therefore marked `allowPublicAccess: true` instead.

**Current callers:** all are under `apps/api/src/routes/api/carbon-inventories/index.ts`. Examples:

- Read: `GET /:id`, `GET /:id/methodology`, `GET /:id/subcategories-summary`, ranking and equivalence endpoints.
- Write: `PATCH /:id`, `PUT /:id/subcategories`, `POST /:id/sync-lines`, `POST /:id/toggle-manual-total-emissions`.

**When to use:** the request operates on a single, well-identified resource, and the resource has a public-by-design capability token (UUID). Do not introduce new anonymous endpoints without a corresponding resource-scoped preHandler.

**Swagger behavior:** the route is documented with two alternative security schemes — `bearerAuth` or `inventoryUuid` (`apps/api/src/plugins/external/swagger.ts:39`). The OpenAPI spec exposes `x-carbon-inventory-uuid` as an `apiKey` security scheme so generated clients know about it.

---

## Choosing the Right Mode

```
Does the route need any per-caller identity to function?
│
├── No  → allowPublicAccess: true
│
└── Yes
    │
    ├── Is the identity tied to a specific resource the caller may legitimately hold
    │   a capability token for (e.g. inventory UUID)?
    │       │
    │       ├── Yes → allowAnonymousAccess: true
    │       │         + requireCarbonInventoryAccess preHandler  (mandatory)
    │       │
    │       └── No  → Private (default) — requireAuth + role checks as needed
```

A few sanity checks before choosing a non-default mode:

- **Public**: the endpoint's response is identical for anonymous and authenticated callers, and the data is content the platform openly publishes. If the response differs by user, it is not public.
- **Anonymous**: there is a single resource ID in the route (e.g. `/:id`), and that resource carries a UUID column intentionally used as a capability. If the route doesn't operate on a specific inventory, anonymous access is the wrong tool.

---

## Implementation Reference

| Concern                            | File                                                             |
| ---------------------------------- | ---------------------------------------------------------------- |
| `FastifyContextConfig` type def    | `apps/api/src/types/fastify.ts`                                  |
| `StandardRouteSignature` options   | `apps/api/src/routes/api/index.ts`                               |
| Skip 401 when flag set             | `apps/api/src/plugins/app/authenticationPlugin.ts`               |
| Skip role check when flag set      | `apps/api/src/plugins/app/authorizationPlugin.ts`                |
| Swagger security scheme per mode   | `apps/api/src/plugins/external/swagger.ts`                       |
| Carbon inventory UUID header check | `apps/api/src/plugins/app/carbonInventoryAuthorizationPlugin.ts` |

The relevant code at the authentication plugin is a single condition shared by both flags:

```typescript
const isPrivateRoute =
  !routeConfig?.allowPublicAccess && !routeConfig?.allowAnonymousAccess;
```

Either flag turns off the 401 fallback for missing credentials. The difference is in what each route then does inside its preHandler chain and in what Swagger advertises to API consumers.
