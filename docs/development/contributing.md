# Contributing Guide

This document describes how to contribute code to Huella Latam: the branch workflow, code review expectations, and the step-by-step process for adding a new API feature.

For the release process (versioning, tagging, deployment), see [Versioning & Releases](../release/versioning.md).
For local setup, see [Local Setup](./local-setup.md).

---

## Table of Contents

1. [Feature Branch Workflow](#feature-branch-workflow)
2. [Commit Conventions](#commit-conventions)
3. [Code Review Expectations](#code-review-expectations)
4. [Adding a New API Feature](#adding-a-new-api-feature)
5. [Adding a New Frontend Feature](#adding-a-new-frontend-feature)
6. [Definition of Done](#definition-of-done)

---

## Feature Branch Workflow

The project follows **GitHub Flow**: short-lived branches cut from `main`, merged back via pull request.

```
main
  │
  ├── feat/add-bulk-accreditation        ← new feature
  ├── fix/nested-emission-factor         ← bug fix
  ├── infra/upgrade-postgres             ← infra change
  └── docs/contributing-guide            ← docs-only change
```

**Branch naming:**

| Prefix      | Use for                                    |
| ----------- | ------------------------------------------ |
| `feat/`     | New features                               |
| `fix/`      | Bug fixes                                  |
| `refactor/` | Code restructuring without behavior change |
| `docs/`     | Documentation-only changes                 |
| `chore/`    | Dependency updates, tooling, CI            |
| `infra/`    | Bicep / deployment script changes          |
| `claude/`   | AI-assisted changes (used by Claude Code)  |

**Branch rules:**

- `main` is always deployable — direct commits are not allowed.
- Branches are cut from the latest `main` and should be short-lived (ideally < 1 week).
- Rebase on top of `main` before opening a PR to keep history linear.
- Delete the branch after the PR is merged.

**Typical flow:**

```bash
git checkout main && git pull
git checkout -b feat/bulk-accreditation

# ... make changes, commit ...

git push -u origin feat/bulk-accreditation
# Open a PR against main
```

---

## Commit Conventions

The project uses **Conventional Commits**. See [Versioning — Commit Convention](../release/versioning.md#commit-convention) for the full reference.

**Format:**

```
<type>(<scope>): <short description>
```

**Examples:**

```
feat(organizations): add bulk accreditation endpoint
fix(carbonInventory): correct emission factor lookup for nested dimensions
test(users): add integration test for bulk update
docs(security): add authentication provider reference
```

**Guidelines:**

- Use the imperative mood ("add" not "added").
- Keep the subject line under 72 characters.
- For complex changes, include a body explaining the _why_, not the _what_.
- One commit per logical change — small, reviewable commits are easier to review than one giant squash.

---

## Code Review Expectations

### Before Opening a PR

Run these commands locally and ensure they all pass:

```bash
pnpm lint          # ESLint, zero warnings required
pnpm type-check    # TypeScript, zero errors
pnpm format:check  # Prettier formatting
pnpm test          # All test suites pass
pnpm build         # Production build succeeds
```

CI runs the same checks and must pass before merge.

### Opening the PR

**PR title:** Follow the commit convention format (it becomes the squash commit message when merged).

**PR description should include:**

- **Summary** — what changed and why (1-3 bullet points)
- **Test plan** — a checklist of verifications the reviewer can reproduce (curl commands, UI steps, test file paths)
- **Screenshots** (for UI changes) — before/after or short screen recording
- **Breaking changes** — highlighted explicitly if API contract or schema changes

### During Review

**Author responsibilities:**

- Respond to every comment — either address it with a follow-up commit or explain why it's intentional.
- Push follow-up commits rather than amending — this lets reviewers see what changed since their last pass.
- Mark comments as resolved only after the reviewer confirms (unless trivial).
- Keep the PR in sync with `main` — rebase or merge if it falls behind.

**Reviewer responsibilities:**

- Review within 1 business day of request.
- Distinguish blocking comments ("must change") from suggestions ("consider"). Use prefixes like `nit:` for non-blocking style preferences.
- Run the code locally if the change is non-trivial or touches critical paths.
- Approve only when all blocking issues are addressed and CI is green.

### Merge Rules

- At least **one approval** is required.
- **All CI checks must pass** (lint, type-check, format, test, build).
- **Squash and merge** is the default — keeps `main` history clean.
- The branch is deleted automatically after merge.

### CodeRabbit (Automated Review)

The project uses [CodeRabbit](https://coderabbit.ai) for automated PR review. It comments on style, potential bugs, and missing test coverage.

- Treat CodeRabbit comments as a reviewer — address or explain each one.
- CodeRabbit auto-resolves threads when commits reference them (e.g., "Fixed in commit abc123").
- False positives happen — push back with an explanation rather than silently closing.

---

## Adding a New API Feature

This section walks through adding a new endpoint end-to-end, using the existing patterns in `apps/api/`.

### Step 1 — Define the Shared Schema

Shared types (request/response schemas) live in the `@repo/types` package so the frontend can import them.

**Location:** `packages/types/src/<feature>/<action>/schemas.ts`

```typescript
// packages/types/src/organizations/createOrganization/schemas.ts
import { z } from "zod";
import { OrganizationBaseSchema } from "../../baseSchemas/organization.js";

export const CreateOrganizationBodySchema = OrganizationBaseSchema.pick({
  name: true,
  taxId: true,
}).strict();

export const CreateOrganizationResponseSchema = OrganizationBaseSchema;

export type CreateOrganizationBody = z.infer<
  typeof CreateOrganizationBodySchema
>;
export type CreateOrganizationResponse = z.infer<
  typeof CreateOrganizationResponseSchema
>;
```

**Tips:**

- Reuse base schemas from `packages/types/src/baseSchemas/` — pick/omit/extend rather than redefining.
- Use `.strict()` on input schemas to reject unknown properties.
- Export both the schema (runtime validator) and the inferred type (static typing).

### Step 2 — Create the Feature Module

Feature modules live in `apps/api/src/features/<featureName>/`. For a single endpoint, create a subfolder per action.

**Recommended layout:**

```
apps/api/src/features/organizations/
├── app/                              # User-facing endpoints
│   ├── createOrganization/
│   │   ├── route.ts                  # Fastify route definition + schema
│   │   ├── handler.ts                # Request handler (glue)
│   │   └── service.ts                # Business logic (pure, testable)
│   ├── updateOrganization/
│   └── errors.ts                     # Shared domain errors
├── admin/                            # Admin-only endpoints (optional split)
│   └── ...
└── helpers.ts                        # Shared helpers for this feature
```

**For simple features**, skip the `app/admin` split:

```
apps/api/src/features/users/
├── createUser/
│   ├── route.ts
│   ├── handler.ts
│   └── service.ts
├── errors.ts
└── mappers.ts
```

### Step 3 — Write the Service (Business Logic)

Keep business logic pure and testable — accept dependencies (Prisma, services) as parameters rather than importing them globally.

```typescript
// apps/api/src/features/organizations/app/createOrganization/service.ts
import type { PrismaClient } from "@repo/database";
import type {
  CreateOrganizationBody,
  CreateOrganizationResponse,
} from "@repo/types";
import { TaxIdAlreadyUsedError } from "../errors.js";

export async function createOrganizationService(
  prisma: PrismaClient,
  input: CreateOrganizationBody,
  userId: bigint
): Promise<CreateOrganizationResponse> {
  const existing = await prisma.organization.findFirst({
    where: { taxId: input.taxId },
  });
  if (existing) throw new TaxIdAlreadyUsedError();

  const organization = await prisma.organization.create({
    data: { ...input, createdById: userId },
  });

  return organization;
}
```

### Step 4 — Write the Handler

The handler adapts Fastify's request/reply to the service. Keep it thin.

```typescript
// apps/api/src/features/organizations/app/createOrganization/handler.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateOrganizationBody } from "@repo/types";
import { createOrganizationService } from "./service.js";

export async function createOrganizationHandler(
  request: FastifyRequest<{ Body: CreateOrganizationBody }>,
  reply: FastifyReply
) {
  const result = await createOrganizationService(
    request.server.prisma,
    request.body,
    BigInt(request.currentUser!.id)
  );
  return reply.status(201).send(result);
}
```

### Step 5 — Define the Route

The route wires the schema, auth, and handler together.

```typescript
// apps/api/src/features/organizations/app/createOrganization/route.ts
import type { FastifyZodInstance } from "@/types.js";
import {
  CreateOrganizationBodySchema,
  CreateOrganizationResponseSchema,
  type CreateOrganizationBody,
  type CreateOrganizationResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createOrganizationHandler } from "./handler.js";

export function createOrganizationRoute(fastify: FastifyZodInstance) {
  fastify.post<{
    Body: CreateOrganizationBody;
    Reply: CreateOrganizationResponse;
  }>(
    "/",
    {
      schema: {
        tags: ["organizations"],
        body: CreateOrganizationBodySchema,
        response: {
          201: CreateOrganizationResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    createOrganizationHandler
  );
}
```

### Step 6 — Register the Route

Routes are auto-loaded from `apps/api/src/routes/api/` via `@fastify/autoload`. Add a registry file that imports and wires all actions for the feature.

```typescript
// apps/api/src/routes/api/app/organizations/index.ts
import type { FastifyZodInstance } from "@/types.js";
import { createOrganizationRoute } from "@/features/organizations/app/createOrganization/route.js";
import { updateOrganizationRoute } from "@/features/organizations/app/updateOrganization/route.js";

export default function organizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  createOrganizationRoute(fastify);
  updateOrganizationRoute(fastify);
}
```

The file path determines the URL prefix: `routes/api/app/organizations/index.ts` → `/api/app/organizations`.

### Step 7 — Define Domain Errors

Errors live in a feature-level `errors.ts` and use `@fastify/error` for consistent envelopes.

```typescript
// apps/api/src/features/organizations/app/errors.ts
import createError from "@fastify/error";

export const TaxIdAlreadyUsedError = createError(
  "TAX_ID_ALREADY_USED",
  "Tax ID already in use",
  409
);
```

Error responses are shaped as `{ code, message }` — the frontend should match on `code`, not `message`.

### Step 8 — Write Integration Tests

Tests live in `apps/api/test/features/<feature>/<action>/integration.test.ts` and use Testcontainers to spin up a real Postgres instance.

```typescript
// apps/api/test/features/organizations/createOrganization/integration.test.ts
import { afterAll, beforeAll, describe, expect, it, inject } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { createTestApp } from "../../../factories/appFactory.js";

describe("POST /api/app/organizations — Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("creates a new organization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/app/organizations",
      payload: { name: "Acme", taxId: "76.123.456-7" },
    });
    expect(response.statusCode).toBe(201);
  });

  it("returns 409 when tax ID already exists", async () => {
    // ... seed existing org, assert 409
  });
});
```

**Run a single test file:**

```bash
pnpm test --filter=api -- /createOrganization/integration.test.ts --coverage=false
```

### Step 9 — Database Migration (if needed)

If the feature changes the schema:

```bash
cd packages/database
# Edit src/prisma/schema.prisma
pnpm dev:migrate
# Enter a name when prompted (e.g. "add_organization_tax_id")
pnpm dev:generate
```

Commit the generated migration file under `packages/database/migrations/`.

### Step 10 — Verify End-to-End

```bash
pnpm lint
pnpm type-check
pnpm test --filter=api -- /organizations --coverage=false
pnpm dev   # Start full stack, hit the endpoint via Swagger UI at http://localhost:8080/api/docs
```

---

## Adding a New Frontend Feature

Frontend features live in `apps/web/src/`. The rough layout:

| Path                       | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `apps/web/src/screens/`    | Route-level components (a page)              |
| `apps/web/src/components/` | Reusable UI components                       |
| `apps/web/src/hooks/`      | Custom React hooks (API queries, form logic) |
| `apps/web/src/services/`   | API client wrappers (using `ky`)             |
| `apps/web/src/routes/`     | TanStack Router route definitions            |

**Typical flow:**

1. Add the API call to a service file using the shared `@repo/types` schemas.
2. Create a TanStack Query hook in `hooks/` that wraps the service call.
3. Build the screen/component consuming the hook.
4. Register the route in `apps/web/src/routes/` (TanStack Router auto-generates route types).
5. Run `pnpm dev` and test in the browser.

> UI changes should be verified in the browser before PR submission. Type checks pass ≠ feature works.

---

## Definition of Done

A PR is ready for merge when all of the following are true:

- [ ] Code compiles (`pnpm type-check` passes)
- [ ] Lint passes with zero warnings (`pnpm lint`)
- [ ] Format check passes (`pnpm format:check`)
- [ ] All tests pass (`pnpm test`)
- [ ] New features have integration tests; bug fixes have a regression test
- [ ] Database migrations (if any) run cleanly on a fresh DB
- [ ] Swagger UI at `/api/docs` shows the new endpoint(s) correctly
- [ ] UI changes verified in the browser (golden path + one edge case)
- [ ] PR description includes a test plan
- [ ] At least one approval from a reviewer
- [ ] CI is green
- [ ] No unresolved review comments
