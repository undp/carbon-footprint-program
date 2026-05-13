# Plan — Consolidate API Route Security into a Declarative `defineRoute`

> Status: approved, ready for implementation.
> Branch: `refactor/kevin/standarize-api-endpoints` (single PR).

## Decisions

| #   | Question                                          | Decision                                                                                                                                                                       |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Group-default vs per-route explicit `systemRoles` | **Option A** — `registerRoutes` accepts `{ defaultSystemRoles }`; per-route `access.systemRoles` overrides when present.                                                       |
| 2   | `registerRoutes` shape                            | **Option 2a (function-style)** — `(fastify, routes, opts) => void`, called inside each group's `export default function (fastify)`. Uniform with existing sub-prefix patterns. |
| 3   | Default the `:id` route-param extractor           | **Yes** — `extractor` is optional in `OrganizationAccess`/`CarbonInventoryAccess`; when omitted, the helper reads `request.params.id`. Custom extractors stay supported.       |
| 4   | Migration in this PR or split                     | **Same PR** on `refactor/kevin/standarize-api-endpoints`. One commit per phase (and one per group inside Phase 3) so the PR remains bisectable.                                |

## Goals

1. **Single source of truth per route**: the entire security spec (mode + system roles + domain access) lives inside the route's own file. No group-level `addHook` magic that the author has to remember.
2. **Make invalid combinations unrepresentable** at the type level — e.g. `allowAnonymousAccess: true` must carry a `requireCarbonInventoryAccess` config; you can't compile the alternative.
3. **Defense-in-depth at boot**: a Fastify `onRoute` validator walks the registered tree and throws on any inconsistent route — even ones that bypass the new helper.

## Non-Goals

- No behavior change at runtime. Same 401/403 responses, same Swagger output.
- No new auth modes. The three existing modes (private / public / anonymous) stay as-is.
- Not refactoring the underlying plugins (`carbonInventoryAuthorizationPlugin`, etc.) — only how routes wire into them.

---

## What Changes (Author's-Eye View)

### Before (split across two files)

```ts
// routes/api/carbon-inventories/index.ts
fastify.addHook("onRequest", fastify.requireAuth);
fastify.addHook("preHandler", fastify.requireRoles([USER, ADMIN, SUPERADMIN]));
getCarbonInventoryByIdRoute(fastify, { allowAnonymousAccess: true });

// features/carbonInventories/getCarbonInventoryById/route.ts
fastify.get("/:id", {
  schema: {...},
  config: { allowAnonymousAccess: options?.allowAnonymousAccess ?? false, ... },
  preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor, { canAdminsBypass: true })],
}, handler);
```

### After (everything in one file)

```ts
// features/carbonInventories/getCarbonInventoryById/route.ts
export const getCarbonInventoryByIdRoute = defineRoute({
  method: "GET",
  path: "/:id",
  schema: { ... },
  access: {
    mode: "anonymous",
    carbonInventory: { extractor: idRequestExtractor, canAdminsBypass: true },
  },
  handler: getCarbonInventoryByIdHandler,
});

// routes/api/carbon-inventories/index.ts
import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { SystemRole } from "@repo/types";

export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [getCarbonInventoryByIdRoute, updateCarbonInventoryRoute /* ... */],
    {
      defaultSystemRoles: [
        SystemRole.USER,
        SystemRole.ADMIN,
        SystemRole.SUPERADMIN,
      ],
    }
  );
}
```

Group `index.ts` files become a single `registerRoutes(...)` call — no `addHook`, no per-route options, no per-call flag plumbing. The `defaultSystemRoles` is a sensible group-level baseline that any single route can override.

---

## Type Design

A discriminated union on `mode`. The type enforces every invariant we care about.

```ts
// apps/api/src/routing/access.ts

type SystemRolesRequirement =
  | { kind: "any" } // any authenticated user
  | { kind: "roles"; roles: SystemRole[] }; // restrict to a system-role subset

// Extractor pulls a resource ID out of the request. Optional everywhere — when omitted,
// the default reads `request.params.id`, which matches the overwhelming majority of routes.
type IdExtractor = (req: FastifyRequest) => string | bigint;

type OrganizationAccess = {
  extractor?: IdExtractor;
  requiredOrganizationRoles?: OrganizationRole[];
  canAdminsBypass?: boolean;
};

type CarbonInventoryAccess = {
  extractor?: IdExtractor;
  requiredOrganizationRoles?: OrganizationRole[];
  canAdminsBypass?: boolean;
};

type ReductionProjectAccess = {
  requiredOrganizationRoles?: OrganizationRole[];
  canAdminsBypass?: boolean;
};

type DomainAccess =
  | { kind: "organization"; organization: OrganizationAccess }
  | { kind: "carbonInventory"; carbonInventory: CarbonInventoryAccess }
  | { kind: "reductionProject"; reductionProject: ReductionProjectAccess };

export type RouteAccess =
  | { mode: "public" }
  | { mode: "anonymous"; carbonInventory: CarbonInventoryAccess } // forces preHandler
  | {
      mode: "private";
      systemRoles?: SystemRolesRequirement;
      domain?: DomainAccess;
    };
```

**Why this shape:**

- `mode: "anonymous"` syntactically requires a `carbonInventory` block — there's no other valid alternative credential today. If we ever add a second one (e.g. `mode: "anonymous"; reductionProject: ...`), we extend the union; the existing call sites don't break.
- `systemRoles` on `private` is omitted in the common case and inherits the group's `defaultSystemRoles`. When set explicitly, the route overrides the group default.
- `domain` is optional and orthogonal to `systemRoles`. A route can require both ("must be ADMIN system role AND member of org X").
- `extractor` is optional. Default behavior: read `request.params.id`. Custom extractors (e.g. `reductionProjectOrganizationIdExtractor`, which resolves the organization id from the project id) remain supported by passing `extractor` explicitly.

---

## The `defineRoute` Helper

```ts
// apps/api/src/routing/defineRoute.ts

interface RouteDefinition<TBody, TParams, TQuery, TResponse> {
  method: HTTPMethods;
  path: string;
  schema: FastifyZodSchema;
  access: RouteAccess;
  handler: RouteHandler<...>;
}

export function defineRoute<...>(def: RouteDefinition<...>): RegisteredRoute {
  return { __route: def };
}

interface RegisterRoutesOptions {
  /** Applied to every `private` route in the list that omits its own `systemRoles`. */
  defaultSystemRoles?: SystemRole[];
}

export function registerRoutes(
  fastify: FastifyZodInstance,
  routes: RegisteredRoute[],
  options: RegisterRoutesOptions = {},
): void {
  for (const { __route: def } of routes) {
    const access = applyDefaults(def.access, options);
    const { onRequest, preHandler, config } = buildHooks(fastify, access);
    fastify.route({
      method: def.method,
      url: def.path,
      schema: def.schema,
      config,
      onRequest,
      preHandler,
      handler: def.handler,
    });
  }
}
```

`buildHooks` is the central translator. For each `RouteAccess` value it produces:

| Access                                 | `config` flags               | `onRequest`   | `preHandler`                                                |
| -------------------------------------- | ---------------------------- | ------------- | ----------------------------------------------------------- |
| `public`                               | `allowPublicAccess: true`    | —             | —                                                           |
| `anonymous` (+ inventory)              | `allowAnonymousAccess: true` | `requireAuth` | `requireCarbonInventoryAccess(extractor, opts)`             |
| `private` (no constraints)             | —                            | `requireAuth` | —                                                           |
| `private` + `systemRoles`              | —                            | `requireAuth` | `requireRoles(roles)`                                       |
| `private` + `domain: organization`     | —                            | `requireAuth` | `requireOrganizationRole(...)` (+ roles if specified)       |
| `private` + `domain: carbonInventory`  | —                            | `requireAuth` | `requireCarbonInventoryAccess(...)` (+ roles if specified)  |
| `private` + `domain: reductionProject` | —                            | `requireAuth` | `requireReductionProjectAccess(...)` (+ roles if specified) |

`requireAuth` is added implicitly to every non-public route. The author can no longer forget it.

---

## Runtime Validator (`onRoute` Hook)

A small plugin registered before route autoload. Runs once per route at boot. Catches:

1. Route has `config.allowAnonymousAccess === true` but no `requireCarbonInventoryAccess` in the preHandler chain → **throw at startup**.
2. Route has `config.allowPublicAccess === true` AND `allowAnonymousAccess === true` simultaneously → **throw**.
3. Route has `config.allowPublicAccess === true` but its hook chain still contains `requireAuth` / `requireRoles` / a domain check → **throw** (the route is contradicting itself; likely a manual `fastify.get(...)` that bypassed `defineRoute`).
4. Route is on a path matching `/api/admin/**` but isn't gated by `requireRoles` containing `ADMIN` or `SUPERADMIN` → **warn at boot** (configurable as throw).

```ts
// apps/api/src/plugins/app/routeSecurityValidatorPlugin.ts
fastify.addHook("onRoute", (routeOpts) => {
  const issues = collectSecurityIssues(routeOpts);
  if (issues.length)
    throw new RouteSecurityViolationError(routeOpts.url, issues);
});
```

The validator works **independently of `defineRoute`** — it inspects the assembled Fastify route, so manually-registered routes and tests are checked too. This is the safety net.

---

## Group-Level Role Pools

Today, parent `index.ts` files set role pools group-wide via `addHook("preHandler", requireRoles(...))`:

- `routes/api/admin/*` → `[ADMIN, SUPERADMIN]`
- `routes/api/app/*` → `[USER, ADMIN, SUPERADMIN]`
- `routes/api/methodologies/*`, `categories/*`, etc. → `[ADMIN, SUPERADMIN]` (maintainer pages)

Under the new shape (decision #1 — Option A), each group's `index.ts` passes that pool to `registerRoutes` as `defaultSystemRoles`. The default applies to every `private` route in the list whose `access.systemRoles` is omitted. A single route can override by setting its own `systemRoles` explicitly. `public` and `anonymous` routes ignore `defaultSystemRoles` entirely.

```ts
// routes/api/admin/methodologies/index.ts
import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { SystemRole } from "@repo/types";

export default function adminMethodologiesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [createMethodologyRoute, updateMethodologyRoute /* ... */],
    { defaultSystemRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN] }
  );
}
```

---

## Migration Strategy

Five phases. Each ends in a green type-check + lint + test build, so the PR is bisectable.

### Phase 1 — Land the infrastructure (no route changes yet)

- Add `apps/api/src/routing/access.ts` (types)
- Add `apps/api/src/routing/defineRoute.ts` (`defineRoute`, `registerRoutes`, `buildHooks`)
- Add `apps/api/src/plugins/app/routeSecurityValidatorPlugin.ts`
- Register the validator plugin in `app.ts`
- Run existing tests → must stay green (validator runs on current routes, should pass since today's state is consistent).

### Phase 2 — Migrate one small, varied group as a pilot

- Pick `routes/api/transparency/` + `routes/api/explanations/` (public routes — simplest) + `routes/api/admin/methodologies/` (admin + private + maintainer role pool).
- Verify the new code reads cleanly, matches the design.
- Iterate on `defineRoute` ergonomics if anything feels off.

### Phase 3 — Migrate by domain group, one commit per group

Order chosen to surface complexity early:

1. Public groups: `terms-conditions`, `transparency`, `explanations` (done in phase 2)
2. Maintainer groups: `categories`, `subcategories`, `methodologies`, `magnitudes`, `measurement-units`, `emission-factors`, `subcategory-recommendations`, `badges`, `country-*`, etc.
3. App groups: `users`, `forms`, `submissions`, `files`
4. Domain-access groups: `organizations` (app+admin), `reduction-projects`
5. The big one: `carbon-inventories` (mix of all three modes, ~25 routes)

Each commit converts one group's route files + its parent `index.ts` together. Conventional commit message: `refactor(api): consolidate <group> route security via defineRoute`.

### Phase 4 — Remove the old `StandardRouteSignature` shape

- Delete the legacy type from `routes/api/index.ts`.
- Remove the `options?: { allowPublicAccess?; allowAnonymousAccess? }` argument from any holdouts.
- TypeScript flushes out anything missed.

### Phase 5 — Tighten the validator

- Promote the `admin/**` path check from warn to throw.
- Add additional invariants we discover during migration. Likely candidates:
  - A route under `/:id` that uses `domain: organization` without a custom `extractor` is suspicious — the default extractor would auth against the route's `:id` param, which may not be an organization id at all.
  - Cross-domain stacking (e.g. `domain: organization` + `domain: carbonInventory` on the same route) is currently impossible in the type but the validator should also reject it at runtime, in case someone bypasses `defineRoute`.

### Phase 6 — Update the docs to the new shape

By this phase the codebase is fully on `defineRoute`. The existing docs still describe the old `allowPublicAccess: true` / `allowAnonymousAccess: true` flag-and-manual-preHandler idiom — they need to teach the new author-facing shape and link to the new code.

Update `docs/security/route-access-modes.md`:

- Replace the "How to declare" parts of each mode section with `defineRoute` examples (private / public / anonymous). The behavior descriptions (what each mode does at runtime, when to use it) stay as-is — that part of the doc is still correct.
- Add a "Hook synthesis reference" subsection containing the `buildHooks` table from this plan (Access × config flags × `onRequest` × `preHandler`). It belongs in the docs as the canonical reference for what each `RouteAccess` shape produces.
- Replace the inline code snippet showing the old `config: { allowPublicAccess: ... }` boilerplate with a snippet showing the new `access: { mode: "..." }` form.
- Rewrite the "Implementation Reference" file-pointer table:
  - Add `apps/api/src/routing/access.ts` (types)
  - Add `apps/api/src/routing/defineRoute.ts` (helper + `buildHooks`)
  - Add `apps/api/src/plugins/app/routeSecurityValidatorPlugin.ts` (boot-time invariants)
  - Drop the `apps/api/src/routes/api/index.ts` row (the legacy `StandardRouteSignature` is gone).
- Update the "Hard rule — `requireCarbonInventoryAccess` is mandatory" callout: it now reads "the type system enforces this — `mode: "anonymous"` cannot be expressed without `carbonInventory`. The validator is the defense-in-depth backstop."

Update `docs/development/api-conventions.md`:

- The "Plugin Architecture" table still lists `requireAuth` / `requireRoles` as decorators the author calls. Keep the entries but add a sentence: "Routes do not call these decorators directly anymore — they declare `access` on `defineRoute` and `registerRoutes` wires the hooks."
- Replace the `routes/api/.../index.ts` example (the `addHook` + per-route function call pattern) with the `registerRoutes(...)` shape.
- Add a one-line pointer to `route-access-modes.md` as the canonical security reference.

No new docs are created in this phase. The two existing files are the right homes — the plan doc itself can be archived or kept as a historical artifact, your call.

---

## Test Strategy

- **Integration tests are untouched.** They use `app.inject()` and only care about request/response. Same routes, same 401/403/200 behavior → same test results.
- **New unit tests** for `buildHooks`:
  - Given each `RouteAccess` shape, produces the expected `(onRequest, preHandler, config)` triple.
- **New unit tests** for the validator:
  - Each bad-combination case throws with a descriptive message.
- Add a CI step: `pnpm --filter=api start --dry-run` (or a small `validate-routes` script) that boots the app, lets the validator run, and exits 0. Catches regressions cheaply.

---

## Files Touched (Estimate)

| Category               | Files | Notes                                                                                                                                                                                               |
| ---------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New infrastructure     | ~4    | `access.ts`, `defineRoute.ts`, validator plugin, validator tests                                                                                                                                    |
| Feature route files    | ~155  | Rewrite each from `StandardRouteSignature` to `defineRoute`                                                                                                                                         |
| Group `index.ts` files | ~25   | Rewrite to `registerRoutes([...], { defaultSystemRoles })`                                                                                                                                          |
| `app.ts`               | 1     | Register validator plugin                                                                                                                                                                           |
| `routes/api/index.ts`  | 1     | Drop `StandardRouteSignature` export                                                                                                                                                                |
| Docs                   | 2     | Rewrite `route-access-modes.md` (declaration examples + hook synthesis table + file pointers) and `api-conventions.md` (mention `defineRoute`/`registerRoutes` as the canonical pattern) in Phase 6 |

---

## Commit Strategy

One PR on `refactor/kevin/standarize-api-endpoints`. Commits map to the migration phases above so the PR stays bisectable:

- `feat(api): add defineRoute infrastructure and route-security validator` — Phase 1
- `refactor(api): consolidate <group> route security via defineRoute` — one per group inside Phase 3 (~25 commits)
- `refactor(api): remove legacy StandardRouteSignature` — Phase 4
- `feat(api): tighten route-security validator invariants` — Phase 5
- `docs: update route access modes & api conventions for defineRoute` — Phase 6

`pnpm format && pnpm lint && pnpm type-check` runs before every commit, per the project commit workflow.
