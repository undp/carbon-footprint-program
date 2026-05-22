import fp from "fastify-plugin";
import type { FastifyPluginCallback, RouteOptions } from "fastify";

import { getHookKind, type HookKind } from "@/routing/hookTags.js";

/**
 * Thrown at boot when a registered route's security configuration is invalid.
 * The Fastify lifecycle propagates this — the process exits before the server
 * starts listening, so misconfiguration cannot reach production silently.
 */
export class RouteSecurityViolationError extends Error {
  readonly url: string;
  readonly issues: string[];

  constructor(url: string, issues: string[]) {
    super(
      `Route security configuration is invalid for ${url}:\n  - ${issues.join(
        "\n  - "
      )}`
    );
    this.name = "RouteSecurityViolationError";
    this.url = url;
    this.issues = issues;
  }
}

// Hooks come from Fastify's RouteOptions and may be sync or async; we never
// invoke them here, only inspect their identity via getHookKind.
type HookList = RouteOptions["onRequest"] | RouteOptions["preHandler"];

function normalizeHooks(hooks: HookList): unknown[] {
  if (hooks == null) return [];
  return Array.isArray(hooks) ? hooks : [hooks];
}

function hookKinds(hooks: HookList): HookKind[] {
  return normalizeHooks(hooks)
    .map((hook) => getHookKind(hook))
    .filter((kind): kind is HookKind => kind !== undefined);
}

const DOMAIN_ACCESS_KINDS: ReadonlySet<HookKind> = new Set([
  "requireOrganizationRole",
  "requireCarbonInventoryAccess",
  "requireReductionProjectAccess",
]);

/**
 * Collects the security invariants that a route violates. Returns an empty
 * array when the route is fine.
 *
 * Hooks built via `defineRoute` are tagged with their kind (see `hookTags.ts`),
 * which lets us check not just presence but identity (e.g. "anonymous mode
 * requires the carbonInventoryAccess hook specifically, not any preHandler").
 * Untagged hooks on routes that bypass `defineRoute` are treated as unknown
 * functions — the flag-level invariants still apply, but the tag-specific
 * checks degrade gracefully.
 */
export function collectSecurityIssues(routeOpts: RouteOptions): string[] {
  const issues: string[] = [];
  const config = routeOpts.config;

  const isPublic = config?.allowPublicAccess === true;
  const isAnonymous = config?.allowAnonymousAccess === true;

  const onRequestKinds = hookKinds(routeOpts.onRequest);
  const preHandlerKinds = hookKinds(routeOpts.preHandler);
  const preHandlerCount = normalizeHooks(routeOpts.preHandler).length;

  // 1. Flags are mutually exclusive — pick exactly one (or neither for private).
  if (isPublic && isAnonymous) {
    issues.push(
      "config has both allowPublicAccess and allowAnonymousAccess set to true — pick one"
    );
  }

  // 2. Anonymous mode must validate the alternative credential. With the
  //    typed `defineRoute` API this is forced; the validator also guards
  //    against manually-registered routes that bypass the helper.
  if (isAnonymous) {
    if (preHandlerCount === 0 || preHandlerKinds.length === 0) {
      // Fail closed: either no preHandler at all, or preHandler(s) exist but
      // are untagged (manually-registered / bypassing `defineRoute`). Without
      // a tagged `requireCarbonInventoryAccess` we cannot prove the alternative
      // credential is being validated.
      issues.push(
        "config.allowAnonymousAccess is true but the route has no tagged requireCarbonInventoryAccess preHandler — the alternative credential (e.g. x-carbon-inventory-uuid) cannot be validated"
      );
    } else if (!preHandlerKinds.includes("requireCarbonInventoryAccess")) {
      // Tagged preHandlers exist but none is the carbon-inventory check.
      issues.push(
        "config.allowAnonymousAccess is true but the preHandler chain does not include requireCarbonInventoryAccess — the alternative credential cannot be validated"
      );
    }
  }

  // 3. Public mode should have no authorization preHandlers. The auth plugin
  //    will skip the 401 because of the config flag, but layering a role or
  //    domain check on a "public" route is contradictory.
  if (isPublic) {
    const authzKinds = preHandlerKinds.filter(
      (kind) => kind === "requireRoles" || DOMAIN_ACCESS_KINDS.has(kind)
    );
    if (authzKinds.length > 0) {
      issues.push(
        `config.allowPublicAccess is true but the preHandler chain runs authorization checks (${authzKinds.join(", ")}) — a public route cannot also be access-gated`
      );
    }
  }

  // Suppress an unused-variable warning while keeping the hook list available
  // for future invariants without re-deriving it.
  void onRequestKinds;

  return issues;
}

const routeSecurityValidatorPlugin: FastifyPluginCallback = (
  fastify,
  _opts,
  done
) => {
  fastify.addHook("onRoute", (routeOpts) => {
    const issues = collectSecurityIssues(routeOpts);
    if (issues.length > 0) {
      throw new RouteSecurityViolationError(routeOpts.url, issues);
    }
  });

  fastify.log.info("Route security validator registered");
  done();
};

export default fp(routeSecurityValidatorPlugin, {
  name: "route-security-validator-plugin",
});
