# API Design Conventions

This document describes the structural patterns used by the Fastify API in `apps/api`. Every feature follows the same layout so that new features slot in predictably.

---

## Feature Folder Pattern

Each API feature lives at `apps/api/src/features/<resource>/<scope>/<action>/`:

```
apps/api/src/features/organizations/app/
├── createOrganization/
│   ├── handler.ts
│   ├── service.ts
│   └── route.ts
├── getOrganizationById/
│   ├── handler.ts
│   ├── service.ts
│   └── route.ts
└── updateOrganization/
    ├── handler.ts
    ├── service.ts
    └── route.ts
```

| File         | Responsibility                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `route.ts`   | Registers a Fastify route: method, URL, schema, preHandlers, handler wiring                         |
| `handler.ts` | Thin HTTP layer — pulls inputs from `request`, calls the service, returns the response              |
| `service.ts` | Pure business logic — receives Prisma client, parsed inputs, and the current user; no HTTP concerns |

**Zod schemas do not live in the feature folder.** They live in `@repo/types` (see below).

---

## Schema Colocation

Request/response schemas are defined in the shared `@repo/types` package, mirroring the feature folder structure:

```
packages/types/src/organizations/app/getOrganizationById/schemas.ts
```

The route imports them and attaches them to the Fastify schema:

```typescript
import {
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
} from "@repo/types";

fastify.get("/:id", {
  schema: {
    params: GetOrganizationByIdParamsSchema,
    response: {
      200: GetOrganizationByIdResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  preHandler: [...],
}, handler);
```

Zod validation happens at the Fastify `preValidation` phase via `fastify-type-provider-zod`. Invalid requests never reach the handler.

**Why `@repo/types`?** The frontend consumes the same schemas for form validation and request typing, so the API and UI are guaranteed to agree on shape.

---

## Route Registration

The app uses Fastify's `@fastify/autoload` to register plugins and routes from directories:

```typescript
// apps/api/src/app.ts
await app.register(autoload, { dir: ".../plugins/external" }); // Third-party plugins
await app.register(autoload, { dir: ".../plugins/app" }); // Custom app plugins
await app.register(autoload, {
  dir: ".../routes",
  autoHooks: true,
  cascadeHooks: true,
});
```

Each `route.ts` exports a `defineRoute(...)` value (not a function that mutates Fastify). The route's security spec lives on its own `access` field — authors never call `requireAuth` / `requireRoles` / `requireOrganizationRole` directly. The group's `index.ts` collects all the routes and hands them to `registerRoutes`, which translates `access` into the right hooks:

```typescript
// routes/api/admin/organizations/index.ts
import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllOrganizationsRoute } from "@/features/organizations/admin/getAllOrganizations/route.js";
import { blockOrganizationRoute } from "@/features/organizations/admin/blockOrganization/route.js";
import { SystemRole } from "@repo/database";

export default function adminOrganizationsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [getAllOrganizationsRoute, blockOrganizationRoute /* ... */],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
```

`defaultSystemRoles` is the group-level baseline for `private` routes that don't set their own `systemRoles`. `public` and `anonymous` routes ignore it.

See **[Route Access Modes](../security/route-access-modes.md)** for the full author guide — the three modes, the `access` shape, declaration examples per mode, and the runtime hook chain each one produces.

---

## Plugin Architecture

Plugins are split into two folders:

### `plugins/external/` — third-party plugins

| Plugin                         | Purpose                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `cors.ts`                      | CORS configuration                                                                           |
| `helmet.ts`                    | HTTP security headers (currently not registered — see [Hardening](../security/hardening.md)) |
| `jwt.ts`                       | JWKS-based JWT validation                                                                    |
| `swagger.ts` / `swagger-ui.ts` | OpenAPI spec + docs UI at `/api/docs`                                                        |
| `multipart.ts`                 | File upload support                                                                          |
| `rate-limit.ts`                | In-memory rate limiting (100 req/min)                                                        |
| `under-pressure.ts`            | Health check + load shedding                                                                 |

### `plugins/app/` — custom plugins

| Plugin                                   | Decorates                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `authenticationPlugin.ts`                | `fastify.requireAuth` — verifies the JWT                                             |
| `authorizationPlugin.ts`                 | `fastify.requireRoles([...])` — system role check                                    |
| `organizationAuthorizationPlugin.ts`     | `fastify.requireOrganizationRole(extractor, opts)` — per-org role check              |
| `carbonInventoryAuthorizationPlugin.ts`  | `fastify.requireCarbonInventoryAccess(extractor, opts)` — per-inventory access check |
| `reductionProjectAuthorizationPlugin.ts` | `fastify.requireReductionProjectAccess(opts)` — per-project access check             |
| `userResolvePlugin.ts`                   | Populates `request.currentUser` from the token claims                                |
| `routeSecurityValidatorPlugin.ts`        | Validates every route's security configuration at boot                               |
| `errorHandler.ts`                        | Unified error response formatting                                                    |
| `prisma.ts`                              | `fastify.prisma` — the shared Prisma client                                          |

Routes do not call these decorators directly anymore. They declare an `access` field via `defineRoute`, and `registerRoutes` translates that into the correct hook chain — see [Route Access Modes](../security/route-access-modes.md).

---

## Authorization

Authorization is expressed declaratively on each route's `access` field. See [Route Access Modes](../security/route-access-modes.md) for the full guide; the summary here is just the shape.

### System roles

Roles from the `SystemRole` enum: `USER`, `ADMIN`, `SUPERADMIN`. Set as the group's `defaultSystemRoles` (most routes inherit it), or per-route via `access.systemRoles` when a route needs to override:

```typescript
// group-level baseline (routes/api/admin/<group>/index.ts)
registerRoutes(fastify, [...], {
  defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN],
});

// per-route override (route file)
access: {
  mode: "private",
  systemRoles: { kind: "roles", roles: [SystemRole.SUPERADMIN] },
}
```

### Organization roles

Roles from `OrganizationRole`: `VIEWER`, `CONTRIBUTOR`, `ADMIN`. Set as a `domain` on the route's `access`. The default extractor reads `request.params.id`; pass `extractor` explicitly when the id lives elsewhere:

```typescript
access: {
  mode: "private",
  domain: {
    kind: "organization",
    organization: {
      allowedRoles: [OrganizationRole.ADMIN],
      canAdminsBypass: true, // System ADMINs bypass org checks
    },
  },
}
```

For routes that touch more than one resource at once (e.g. both `:organizationId` and `:carbonInventoryId`), pass an array to `domain` — every preHandler runs and the caller must satisfy all of them. Same story for `domain: { kind: "carbonInventory", … }` and `domain: { kind: "reductionProject", … }`.

---

## Error Handling

Errors use `@fastify/error`:

```typescript
// apps/api/src/features/organizations/errors.ts
export const OrganizationNotFoundError = createError(
  "ORGANIZATION_NOT_FOUND",
  "Organization with ID %s not found",
  404
);
```

Services throw these errors:

```typescript
throw new OrganizationNotFoundError(organizationId);
```

The central `errorHandler` plugin catches every error and normalizes the response:

```json
{
  "code": "ORGANIZATION_NOT_FOUND",
  "message": "Organization with ID 42 not found"
}
```

Prisma errors are translated automatically:

| Prisma code | HTTP status | Meaning                       |
| ----------- | ----------- | ----------------------------- |
| `P2002`     | 409         | Unique constraint violation   |
| `P2025`     | 404         | Record not found              |
| Others      | 500         | Fall through to generic error |

---

## Response Shape Conventions

- **200 OK** — GET and PATCH. Returns the resource directly (no wrapper object).
- **201 Created** — POST. Returns the created resource. Handler factories set the status automatically.
- **204 No Content** — DELETE. Empty body.
- **4xx / 5xx** — All errors follow the shape `{ code, message }`.

Never wrap successful responses in `{ data: ... }`. The response schema in `@repo/types` defines the shape directly.

---

## Adding a New Feature

1. **Define the schema** in `packages/types/src/<resource>/<scope>/<action>/schemas.ts`:

   ```typescript
   export const DoSomethingBodySchema = z.object({ ... });
   export const DoSomethingResponseSchema = z.object({ ... });
   ```

   Export from the package's `index.ts`.

2. **Create the service** at `apps/api/src/features/<resource>/<scope>/<action>/service.ts`:

   ```typescript
   export const doSomethingService = async (
     prisma: PrismaClient,
     body: DoSomethingBody,
     user: AuthenticatedUser
   ): Promise<DoSomethingResponse> => {
     // business logic
   };
   ```

3. **Create the handler** at `handler.ts`. For simple CRUD, use factories (`createPostHandler`, etc.); otherwise implement manually:

   ```typescript
   export const doSomethingHandler = async (
     request: FastifyRequest<{ Body: DoSomethingBody }>,
     reply: FastifyReply
   ) => {
     const result = await doSomethingService(
       request.server.prisma,
       request.body,
       request.currentUser
     );
     return reply.code(200).send(result);
   };
   ```

4. **Create the route** at `route.ts` using `defineRoute`:

   ```typescript
   import { defineRoute } from "@/routing/defineRoute.js";
   import { OrganizationRole } from "@repo/database/enums";
   import { doSomethingHandler } from "./handler.js";
   import {
     DoSomethingBody,
     DoSomethingBodySchema,
     DoSomethingResponseSchema,
     IdParams,
     IdParamsSchema,
   } from "@repo/types";

   export const doSomethingRoute = defineRoute<{
     Params: IdParams;
     Body: DoSomethingBody;
   }>({
     method: "POST",
     path: "/:id/action",
     schema: {
       params: IdParamsSchema,
       body: DoSomethingBodySchema,
       response: { 200: DoSomethingResponseSchema },
     },
     access: {
       mode: "private",
       domain: {
         kind: "organization",
         organization: {
           allowedRoles: [OrganizationRole.CONTRIBUTOR, OrganizationRole.ADMIN],
         },
       },
     },
     handler: doSomethingHandler,
   });
   ```

5. **Register the route** in the appropriate `apps/api/src/routes/api/<scope>/<resource>/index.ts`:

   ```typescript
   import { registerRoutes } from "@/routing/defineRoute.js";
   import { doSomethingRoute } from "@/features/<resource>/<scope>/<action>/route.js";

   export default function someResourceRoutes(fastify: FastifyZodInstance) {
     registerRoutes(fastify, [doSomethingRoute /* ...other routes */]);
   }
   ```

   See [Route Access Modes](../security/route-access-modes.md) for the full `access` shape and the available modes (`public`, `anonymous`, `private`).

6. **Add error classes** if needed at `apps/api/src/features/<resource>/errors.ts`.

7. **Write the integration test** under `apps/api/test/features/<resource>/<action>/integration.test.ts`. See [Testing Guide](./testing.md).

---

## Lint and Type Rules

- Every handler must use the Zod response schema — no untyped `reply.send(anything)`.
- Services must never import `FastifyRequest` or `FastifyReply` — they take plain inputs.
- Database access always goes through Prisma via `request.server.prisma` or a transaction handle; never construct raw SQL.
- Route handlers should be thin (≤ 15 lines typical). Complex logic belongs in services.

These rules are partially enforced by ESLint; where they are not, reviewers enforce them during PR review.

---

## Picker vs. Display Rule for Reference Data

When a feature uses a soft-delete status pattern (e.g. `MeasurementUnitStatus.ACTIVE / DELETED`), read queries must be classified as either **picker** or **display**:

| Context     | Description                                                         | Filter                        |
| ----------- | ------------------------------------------------------------------- | ----------------------------- |
| **Picker**  | User is selecting a value for a new record (dropdown, autocomplete) | `WHERE status = 'ACTIVE'`     |
| **Display** | Showing an existing record's stored value (even if deleted)         | No status filter — show as-is |

**Why this matters**: if a unit was active when data was recorded and later deleted, display contexts must still show the original label. Picker contexts must never offer deleted units for new assignments.

**Current picker endpoints** (filter to `ACTIVE`):

- `GET /api/measurement-units` (`getAllMeasurementUnits`)
- `GET /api/measurement-units/rates` (`getAllRateMeasurementUnits`)
- The `buildRateUnitsByMagnitudeMap` helper in `getCarbonInventoryMethodology`

When adding new read paths that touch `measurement_unit` or `rate_measurement_unit`, always classify the call site and apply the rule accordingly. Document the audit results in `apps/api/src/features/measurementUnits/README.md`.
