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

| File | Responsibility |
|---|---|
| `route.ts` | Registers a Fastify route: method, URL, schema, preHandlers, handler wiring |
| `handler.ts` | Thin HTTP layer — pulls inputs from `request`, calls the service, returns the response |
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
await app.register(autoload, { dir: ".../plugins/external" });  // Third-party plugins
await app.register(autoload, { dir: ".../plugins/app" });       // Custom app plugins
await app.register(autoload, {
  dir: ".../routes",
  autoHooks: true,
  cascadeHooks: true,
});
```

Inside `apps/api/src/routes/api/app/organizations/index.ts`, each route is explicitly imported and called:

```typescript
import createOrganizationRoute from "@/features/organizations/app/createOrganization/route.js";
import getOrganizationByIdRoute from "@/features/organizations/app/getOrganizationById/route.js";

export default function appOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook("preHandler", fastify.requireRoles([...systemRoles]));

  createOrganizationRoute(fastify);
  getOrganizationByIdRoute(fastify);
}
```

Each `route.ts` exports a `StandardRouteSignature` function that registers a single endpoint on the Fastify instance.

---

## Plugin Architecture

Plugins are split into two folders:

### `plugins/external/` — third-party plugins

| Plugin | Purpose |
|---|---|
| `cors.ts` | CORS configuration |
| `helmet.ts` | HTTP security headers (currently not registered — see [Hardening](../security/hardening.md)) |
| `jwt.ts` | JWKS-based JWT validation |
| `swagger.ts` / `swagger-ui.ts` | OpenAPI spec + docs UI at `/api/docs` |
| `multipart.ts` | File upload support |
| `rate-limit.ts` | In-memory rate limiting (100 req/min) |
| `under-pressure.ts` | Health check + load shedding |

### `plugins/app/` — custom plugins

| Plugin | Decorates |
|---|---|
| `authenticationPlugin.ts` | `fastify.requireAuth` — verifies the JWT |
| `authorizationPlugin.ts` | `fastify.requireRoles([...])` — system role check |
| `organizationAuthorizationPlugin.ts` | `fastify.requireOrganizationRole(extractor, opts)` — per-org role check |
| `userResolvePlugin.ts` | Populates `request.currentUser` from the token claims |
| `errorHandler.ts` | Unified error response formatting |
| `prisma.ts` | `fastify.prisma` — the shared Prisma client |

---

## Authorization

### System roles

Roles from the `SystemRole` enum: `USER`, `ADMIN`, `SUPERADMIN`. Applied at the route-group level:

```typescript
fastify.addHook("preHandler", fastify.requireRoles([SystemRole.ADMIN]));
```

### Organization roles

Roles from `OrganizationRole`: `VIEWER`, `CONTRIBUTOR`, `ADMIN`. Applied per-route, with an `extractor` that pulls the organization ID from the request:

```typescript
fastify.patch("/:id", {
  preHandler: [
    fastify.requireOrganizationRole(idRequestExtractor, {
      allowedRoles: [OrganizationRole.ADMIN],
      canAdminsBypass: true,  // System ADMINs bypass org checks
    }),
  ],
}, handler);
```

`idRequestExtractor` reads the `:id` URL parameter. Custom extractors exist for body-based or nested paths.

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

| Prisma code | HTTP status | Meaning |
|---|---|---|
| `P2002` | 409 | Unique constraint violation |
| `P2025` | 404 | Record not found |
| Others | 500 | Fall through to generic error |

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
     user: AuthenticatedUser,
   ): Promise<DoSomethingResponse> => {
     // business logic
   };
   ```

3. **Create the handler** at `handler.ts`. For simple CRUD, use factories (`createPostHandler`, etc.); otherwise implement manually:
   ```typescript
   export const doSomethingHandler = async (
     request: FastifyRequest<{ Body: DoSomethingBody }>,
     reply: FastifyReply,
   ) => {
     const result = await doSomethingService(
       request.server.prisma,
       request.body,
       request.currentUser,
     );
     return reply.code(200).send(result);
   };
   ```

4. **Create the route** at `route.ts`:
   ```typescript
   export default function doSomethingRoute(fastify: FastifyZodInstance) {
     fastify.post("/:id/action", {
       schema: {
         params: IdParamsSchema,
         body: DoSomethingBodySchema,
         response: { 200: DoSomethingResponseSchema },
       },
       preHandler: [
         fastify.requireOrganizationRole(idRequestExtractor, {
           allowedRoles: [OrganizationRole.CONTRIBUTOR, OrganizationRole.ADMIN],
         }),
       ],
     }, doSomethingHandler);
   }
   ```

5. **Register the route** in the appropriate `apps/api/src/routes/api/<scope>/<resource>/index.ts`:
   ```typescript
   doSomethingRoute(fastify);
   ```

6. **Add error classes** if needed at `apps/api/src/features/<resource>/errors.ts`.

7. **Write the integration test** under `apps/api/test/features/<resource>/<action>/integration.test.ts`. See [Testing Guide](./testing.md).

---

## Lint and Type Rules

- Every handler must use the Zod response schema — no untyped `reply.send(anything)`.
- Services must never import `FastifyRequest` or `FastifyReply` — they take plain inputs.
- Database access always goes through Prisma via `request.server.prisma` or a transaction handle; never construct raw SQL.
- Route handlers should be thin (≤ 15 lines typical). Complex logic belongs in services.

These rules are partially enforced by ESLint; where they are not, reviewers enforce them during PR review.
