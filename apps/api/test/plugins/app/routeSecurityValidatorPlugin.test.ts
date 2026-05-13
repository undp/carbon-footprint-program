import { describe, expect, it } from "vitest";
import type { RouteOptions } from "fastify";

import { collectSecurityIssues } from "@/plugins/app/routeSecurityValidatorPlugin.js";
import { tagHook } from "@/routing/hookTags.js";

type Hook = () => Promise<void>;

function makeHook(kind?: Parameters<typeof tagHook>[1]): Hook {
  const hook: Hook = () => Promise.resolve();
  if (kind) tagHook(hook, kind);
  return hook;
}

function makeRoute(overrides: Partial<RouteOptions>): RouteOptions {
  return {
    url: "/test",
    method: "GET",
    handler: () => Promise.resolve(),
    ...overrides,
  } as RouteOptions;
}

describe("collectSecurityIssues", () => {
  describe("flag invariants", () => {
    it("accepts a normal private route with no flags", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook("requireRoles")],
        })
      );
      expect(issues).toEqual([]);
    });

    it("rejects allowPublicAccess + allowAnonymousAccess together", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowPublicAccess: true, allowAnonymousAccess: true },
        })
      );
      expect(issues).toContainEqual(
        expect.stringContaining(
          "both allowPublicAccess and allowAnonymousAccess"
        )
      );
    });
  });

  describe("anonymous mode", () => {
    it("accepts anonymous with a tagged carbonInventoryAccess preHandler", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowAnonymousAccess: true },
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook("requireCarbonInventoryAccess")],
        })
      );
      expect(issues).toEqual([]);
    });

    it("rejects anonymous with no preHandler at all", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowAnonymousAccess: true },
          onRequest: [makeHook("requireAuth")],
        })
      );
      expect(issues).toContainEqual(
        expect.stringContaining(
          "allowAnonymousAccess is true but the route has no preHandler"
        )
      );
    });

    it("rejects anonymous with a preHandler that isn't carbonInventoryAccess", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowAnonymousAccess: true },
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook("requireOrganizationRole")],
        })
      );
      expect(issues).toContainEqual(
        expect.stringContaining("does not include requireCarbonInventoryAccess")
      );
    });

    it("tolerates anonymous + untagged preHandler (legacy / manually-registered)", () => {
      // No tag means we have no signal about what the preHandler is — Phase 1
      // invariants still apply (preHandler must be non-empty) but tag-specific
      // checks are suppressed.
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowAnonymousAccess: true },
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook()],
        })
      );
      expect(issues).toEqual([]);
    });
  });

  describe("public mode", () => {
    it("accepts a public route with no authorization preHandlers", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowPublicAccess: true },
          onRequest: [makeHook("requireAuth")],
        })
      );
      expect(issues).toEqual([]);
    });

    it("rejects public + requireRoles preHandler", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowPublicAccess: true },
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook("requireRoles")],
        })
      );
      expect(issues).toContainEqual(
        expect.stringContaining("public route cannot also be access-gated")
      );
    });

    it("rejects public + domain-access preHandler", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          config: { allowPublicAccess: true },
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook("requireCarbonInventoryAccess")],
        })
      );
      expect(issues).toContainEqual(
        expect.stringContaining("public route cannot also be access-gated")
      );
    });
  });

  describe("multiple domain-access preHandlers", () => {
    it("accepts a single domain-access preHandler", () => {
      const issues = collectSecurityIssues(
        makeRoute({
          onRequest: [makeHook("requireAuth")],
          preHandler: [makeHook("requireReductionProjectAccess")],
        })
      );
      expect(issues).toEqual([]);
    });

    it("accepts multiple domain-access preHandlers on the same route", () => {
      // A route like `/organizations/:organizationId/inventories/:carbonInventoryId/...`
      // legitimately needs both checks. The type system supports this via
      // `domain: [...]` and the validator does not reject it.
      const issues = collectSecurityIssues(
        makeRoute({
          onRequest: [makeHook("requireAuth")],
          preHandler: [
            makeHook("requireOrganizationRole"),
            makeHook("requireCarbonInventoryAccess"),
          ],
        })
      );
      expect(issues).toEqual([]);
    });
  });
});
