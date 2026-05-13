import fp from "fastify-plugin";
import type {
  FastifyPluginCallback,
  RouteOptions,
  onRequestHookHandler,
  preHandlerHookHandler,
} from "fastify";

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

type HookList =
  | preHandlerHookHandler
  | preHandlerHookHandler[]
  | onRequestHookHandler
  | onRequestHookHandler[]
  | undefined;

function countHooks(hooks: HookList): number {
  if (!hooks) return 0;
  return Array.isArray(hooks) ? hooks.length : 1;
}

/**
 * Collects the security invariants that a route violates. Returns an empty
 * array when the route is fine. Operates only on observable shape (`config`
 * flags + preHandler presence) — does not try to identify specific decorators
 * by reference or name, so it works uniformly on routes built via `defineRoute`
 * and on manually-registered ones.
 */
export function collectSecurityIssues(routeOpts: RouteOptions): string[] {
  const issues: string[] = [];
  const config = routeOpts.config as
    | { allowPublicAccess?: boolean; allowAnonymousAccess?: boolean }
    | undefined;

  const isPublic = config?.allowPublicAccess === true;
  const isAnonymous = config?.allowAnonymousAccess === true;

  if (isPublic && isAnonymous) {
    issues.push(
      "config has both allowPublicAccess and allowAnonymousAccess set to true — pick one"
    );
  }

  if (isAnonymous && countHooks(routeOpts.preHandler) === 0) {
    issues.push(
      "config.allowAnonymousAccess is true but the route has no preHandler — the alternative credential (e.g. x-carbon-inventory-uuid) cannot be validated"
    );
  }

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
