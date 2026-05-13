# Route Access Modes

Every API route falls into one of three access modes, declared in the route's `access` field via `defineRoute`:

- `mode: "public"` — anyone can call it, no credentials checked.
- `mode: "anonymous"` — callers may authenticate with a Bearer token **or** with an alternative credential (currently the `x-carbon-inventory-uuid` header). The type system requires a `carbonInventory` access block alongside, which becomes the preHandler that validates the alternative credential.
- `mode: "private"` — Bearer token required. System roles and domain-scoped checks are layered on top per route.

This document is about the route-level access mode (what credentials the route accepts). For who can do what once authenticated, see [RBAC and Authorization](./rbac.md). For how identity is established, see [Authentication](./authentication.md).

---

## The Three Modes at a Glance

| Mode          | `defineRoute` `access`                          | Bearer required? | Alternative credential | Typical use case                                       |
| ------------- | ----------------------------------------------- | ---------------- | ---------------------- | ------------------------------------------------------ |
| **Private**   | `{ mode: "private", … }`                        | Yes              | —                      | Anything that operates on a specific user's data       |
| **Public**    | `{ mode: "public" }`                            | No               | None                   | Truly open content (T&C, transparency, explanations)   |
| **Anonymous** | `{ mode: "anonymous", carbonInventory: { … } }` | No               | Inventory UUID header  | Calculator flow — operate on a specific inventory UUID |

Routes are declared with `defineRoute` and collected per group via `registerRoutes`:

```typescript
// feature route file
export const getCarbonInventoryByIdRoute = defineRoute<{
  Params: GetCarbonInventoryByIdParams;
}>({
  method: "GET",
  path: "/:id",
  schema: { ... },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryByIdHandler,
});

// routes/api/carbon-inventories/index.ts
export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [getCarbonInventoryByIdRoute /* ... */],
    {
      defaultSystemRoles: [SystemRole.USER, SystemRole.ADMIN, SystemRole.SUPERADMIN],
    }
  );
}
```

`registerRoutes` translates each route's `access` into the right `onRequest`/`preHandler`/`config` triple — authors never call `requireAuth` / `requireRoles` / `requireOrganizationRole` directly. See [`defineRoute.ts`](#implementation-reference) for the translator.

---

## Private Routes (Default)

Most routes. The expectation: the caller is an authenticated platform user.

**How it works:**

1. `requireAuth` runs as an `onRequest` hook. If no valid credential, the route returns **401 Unauthorized**.
2. `userResolvePlugin` upserts the user into the database and sets `request.currentUser`.
3. If `systemRoles` is set on the route (or inherited from the group's `defaultSystemRoles`), `requireRoles` runs and may return **403 Forbidden**.
4. If `domain` is set, the corresponding domain-access hook runs (org membership, inventory access, or reduction-project access) and may also return **403 Forbidden**.

### Declaration examples

Simplest case — inherits the group's `defaultSystemRoles`:

```typescript
export const getAllCategoriesRoute = defineRoute<{
  Querystring: GetAllCategoriesQuery;
}>({
  method: "GET",
  path: "/",
  schema: { ... },
  access: { mode: "private" },
  handler: getAllCategoriesHandler,
});
```

Explicit per-route role override:

```typescript
access: {
  mode: "private",
  systemRoles: {
    kind: "roles",
    roles: [SystemRole.SUPERADMIN], // only superadmins
  },
},
```

With organization-membership check (default `:id` extractor reads `request.params.id`):

```typescript
access: {
  mode: "private",
  domain: {
    kind: "organization",
    organization: {
      allowedRoles: [OrganizationRole.ADMIN],
    },
  },
},
```

With a custom extractor (when the org id lives somewhere other than `:id`):

```typescript
access: {
  mode: "private",
  domain: {
    kind: "organization",
    organization: {
      extractor: organizationIdRequestExtractor, // reads :organizationId
      allowedRoles: [OrganizationRole.ADMIN, OrganizationRole.CONTRIBUTOR, OrganizationRole.VIEWER],
    },
  },
},
```

### Multiple domain checks

A route that operates on more than one resource (e.g. a path that carries both `:organizationId` and `:carbonInventoryId`) passes an array of `DomainAccess` entries. Every preHandler runs; the caller must satisfy all of them.

```typescript
access: {
  mode: "private",
  domain: [
    {
      kind: "organization",
      organization: {
        extractor: (req) => (req.params as { organizationId: string }).organizationId,
        allowedRoles: [OrganizationRole.ADMIN, OrganizationRole.CONTRIBUTOR],
      },
    },
    {
      kind: "carbonInventory",
      carbonInventory: {
        extractor: (req) => (req.params as { carbonInventoryId: string }).carbonInventoryId,
        requiredOrganizationRoles: [OrganizationRole.ADMIN, OrganizationRole.CONTRIBUTOR],
      },
    },
  ],
},
```

**When to use:** any endpoint that reads or writes user-specific data, organization-scoped data, or admin functionality.

---

## Public Routes (`mode: "public"`)

Public routes serve content that has no per-caller authorization concept. Anyone can call them with no headers or tokens.

**How it works:**

1. `requireAuth` is still added so that `request.authUser` and `request.currentUser` are populated _opportunistically_ when a Bearer token is present — but the auth plugin reads `allowPublicAccess` from the route config and skips the 401 for missing credentials. This lets a handler that opportunistically reads the caller (e.g. setting `createdById`) keep working without forcing auth.
2. No `requireRoles` or domain hooks are registered.
3. The handler runs.

**Result:** unauthenticated callers get a successful response. Authenticated callers get the same response — they are simply identifiable inside the handler if needed.

### Declaration example

```typescript
export const getTransparencyDataRoute = defineRoute<{
  Querystring: { year?: string };
}>({
  method: "GET",
  path: "/",
  schema: { ... },
  access: { mode: "public" },
  handler: getTransparencyDataHandler,
});
```

**Current callers** (`grep -r 'mode: "public"' apps/api/src/features`):

| Route                               | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| `GET /explanations/:slug`           | Public explanations / help content                |
| `GET /transparency`                 | Public transparency dashboard data                |
| `GET /terms-conditions`             | Current T&C metadata                              |
| `GET /terms-conditions/stream`      | T&C file stream                                   |
| `POST /carbon-inventories`          | Calculator can create an inventory without signup |
| `GET /badges/previews`              | Signed SAS URLs for active badge type images      |
| `GET /country-organization-sizes`   | Public selector data                              |
| `GET /country-sectors`              | Public selector data                              |
| `GET /organization-main-activities` | Public selector data                              |
| `GET /measurement-units`            | Public selector data                              |
| `GET /measurement-units/rates`      | Public rate selector data                         |
| `GET /job-positions`                | Public selector data                              |
| `GET /system-parameters`            | Public system configuration                       |

**When to use:** the response does not depend on caller identity, and the data is content the platform intentionally publishes (legal docs, marketing copy, aggregated metrics, selector dropdowns). If even one branch of the handler needs an authenticated user, the route is **not** public — use `mode: "private"` instead.

**Swagger behavior:** the route is documented with **no security scheme** — `security: []` (see [`swagger.ts`](#implementation-reference)).

---

## Anonymous-Allowed Routes (`mode: "anonymous"`)

Anonymous-allowed routes accept either of two credentials:

- A standard Bearer token, **or**
- An alternative, resource-scoped credential — today, the `x-carbon-inventory-uuid` header.

The header carries a UUID that the route's own `preHandler` matches against a specific carbon inventory. The UUID acts as a capability token: holding it grants access to that inventory only, never to others, and only to a curated set of endpoints.

**How it works:**

1. `requireAuth` runs; it does not 401 when no Bearer is present, because the route opts out of mandatory auth via the `allowAnonymousAccess` config flag (which `defineRoute` sets for you).
2. `requireRoles` does **not** run (system role checks are skipped on anonymous routes).
3. The mandatory `requireCarbonInventoryAccess` preHandler runs and:
   - Looks up the target inventory by the ID extracted from the route (default extractor: `request.params.id`).
   - Reads `x-carbon-inventory-uuid` from the request headers.
   - If the header value matches the inventory's `uuid` column, access is granted.
   - Otherwise, the standard membership / creator checks apply (see [`requireCarbonInventoryAccess` in RBAC docs](./rbac.md#fastifyrequirecarboninventoryaccessextractor-options)).
4. The handler runs.

### Declaration example

```typescript
export const getCarbonInventoryByIdRoute = defineRoute<{
  Params: GetCarbonInventoryByIdParams;
}>({
  method: "GET",
  path: "/:id",
  schema: { ... },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryByIdHandler,
});
```

**Why this pattern exists:** the calculator flow lets a visitor create and edit a single inventory without signing up. The inventory's UUID is embedded in the URL the visitor uses; the frontend sends it back as a header so the API can authorize each request against that specific inventory.

**Hard rule — enforced by the type system.** `mode: "anonymous"` syntactically requires the `carbonInventory` block; you cannot declare an anonymous route without it. The route-security validator additionally checks at boot that the generated preHandler chain contains `requireCarbonInventoryAccess`, catching any manually-registered routes that bypass `defineRoute`. `createCarbonInventory` is the only exception in the codebase: it has no inventory yet to authorize against, and is marked `mode: "public"` instead.

**Current callers:** all are under `apps/api/src/routes/api/carbon-inventories/index.ts`. Examples:

- Read: `GET /:id`, `GET /:id/methodology`, `GET /:id/subcategories/summary`, ranking and equivalence endpoints.
- Write: `PATCH /:id`, `PATCH /:id/subcategories`, `POST /:id/lines/sync`, `POST /:id/subcategories/:subcategoryId/manual-total-emissions`.

**When to use:** the request operates on a single, well-identified resource (a carbon inventory), and the resource has a public-by-design capability token (UUID).

**Swagger behavior:** the route is documented with two alternative security schemes — `bearerAuth` or `inventoryUuid` (see [`swagger.ts`](#implementation-reference)). The OpenAPI spec exposes `x-carbon-inventory-uuid` as an `apiKey` security scheme so generated clients know about it.

---

## Choosing the Right Mode

```
Does the route need any per-caller identity to function?
│
├── No  → mode: "public"
│
└── Yes
    │
    ├── Is the identity tied to a single carbon inventory the caller may legitimately hold
    │   a capability token (UUID) for?
    │       │
    │       ├── Yes → mode: "anonymous"
    │       │         + carbonInventory: { ... }   (mandatory, type-enforced)
    │       │
    │       └── No  → mode: "private"
    │                 + systemRoles? + domain?   (as needed)
```

A few sanity checks before choosing a non-default mode:

- **Public**: the endpoint's response is identical for anonymous and authenticated callers, and the data is content the platform openly publishes. If the response differs by user, it is not public.
- **Anonymous**: there is a single resource ID in the route (e.g. `/:id`), and that resource carries a UUID column intentionally used as a capability. If the route doesn't operate on a specific carbon inventory, anonymous access is the wrong tool.

---

## Hook Synthesis Reference

`buildHooks` (in [`defineRoute.ts`](#implementation-reference)) is the single translator from a `RouteAccess` value to the `(onRequest, preHandler, config)` triple Fastify uses. Each row below describes the output for a given access spec.

| Access                                                                             | `config` flags               | `onRequest`            | `preHandler`                                          |
| ---------------------------------------------------------------------------------- | ---------------------------- | ---------------------- | ----------------------------------------------------- |
| `{ mode: "public" }`                                                               | `allowPublicAccess: true`    | `requireAuth` _(soft)_ | —                                                     |
| `{ mode: "anonymous", carbonInventory: {…} }`                                      | `allowAnonymousAccess: true` | `requireAuth`          | `requireCarbonInventoryAccess(extractor, opts)`       |
| `{ mode: "private" }` _(no systemRoles, no domain)_                                | —                            | `requireAuth`          | —                                                     |
| `{ mode: "private", systemRoles: { kind: "roles", roles: [...] } }`                | —                            | `requireAuth`          | `requireRoles(roles)`                                 |
| `{ mode: "private", domain: { kind: "organization", organization: {…} } }`         | —                            | `requireAuth`          | `requireOrganizationRole(extractor, opts)`            |
| `{ mode: "private", domain: { kind: "carbonInventory", carbonInventory: {…} } }`   | —                            | `requireAuth`          | `requireCarbonInventoryAccess(extractor, opts)`       |
| `{ mode: "private", domain: { kind: "reductionProject", reductionProject: {…} } }` | —                            | `requireAuth`          | `requireReductionProjectAccess(opts)`                 |
| `{ mode: "private", domain: [d1, d2, …] }`                                         | —                            | `requireAuth`          | one preHandler per domain entry, in declaration order |
| `{ mode: "private", systemRoles: {…}, domain: {…} }`                               | —                            | `requireAuth`          | `requireRoles(...)` followed by the domain hook(s)    |

`requireAuth` on public routes is "soft": the auth plugin reads `allowPublicAccess` from the config and skips the 401 if no credential is present, but populates `request.currentUser` whenever a valid Bearer token _is_ present.

Every hook produced by `buildHooks` is tagged via `tagHook` (`apps/api/src/routing/hookTags.ts`) so the route-security validator can identify each hook's purpose at boot — see [Validator Invariants](#validator-invariants) below.

---

## Validator Invariants

A Fastify `onRoute` hook (`apps/api/src/plugins/app/routeSecurityValidatorPlugin.ts`) checks every registered route at boot. Boot fails if any invariant is violated. The checks:

1. **Mutually exclusive flags.** `allowPublicAccess` and `allowAnonymousAccess` cannot both be true.
2. **Anonymous needs a preHandler.** A route with `allowAnonymousAccess: true` must have a non-empty `preHandler` chain.
3. **Anonymous needs `requireCarbonInventoryAccess` specifically.** When the route's preHandlers carry the kind tags `defineRoute` stamps onto them, at least one must be `requireCarbonInventoryAccess`. (Untagged preHandlers — e.g. on a route that bypasses `defineRoute` entirely — are treated as unknown; check #2 still applies.)
4. **Public routes cannot stack authorization checks.** A route with `allowPublicAccess: true` whose preHandler chain contains a `requireRoles` or domain-access hook is rejected — that combination is contradictory.

Routes declared with `defineRoute` are already constrained by the type system; the validator is defense-in-depth that also covers manually-registered routes and the `/` health endpoint.

---

## Implementation Reference

| Concern                                         | File                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `RouteAccess` discriminated union               | `apps/api/src/routing/access.ts`                                 |
| `defineRoute` + `registerRoutes` + `buildHooks` | `apps/api/src/routing/defineRoute.ts`                            |
| Hook kind tagging                               | `apps/api/src/routing/hookTags.ts`                               |
| Boot-time validator                             | `apps/api/src/plugins/app/routeSecurityValidatorPlugin.ts`       |
| `FastifyContextConfig` flag type def            | `apps/api/src/types/fastify.ts`                                  |
| Skip 401 when public/anonymous flag set         | `apps/api/src/plugins/app/authenticationPlugin.ts`               |
| Skip role check when public/anonymous flag set  | `apps/api/src/plugins/app/authorizationPlugin.ts`                |
| Swagger security scheme per mode                | `apps/api/src/plugins/external/swagger.ts`                       |
| Carbon inventory UUID header check              | `apps/api/src/plugins/app/carbonInventoryAuthorizationPlugin.ts` |

The relevant code at the authentication plugin is a single condition shared by both flags:

```typescript
const isPrivateRoute =
  !routeConfig?.allowPublicAccess && !routeConfig?.allowAnonymousAccess;
```

Either flag turns off the 401 fallback for missing credentials. The difference is in what each route then does inside its preHandler chain and in what Swagger advertises to API consumers.
