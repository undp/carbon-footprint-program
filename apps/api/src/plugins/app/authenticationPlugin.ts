/**
 * @fileoverview Authentication Plugin for Fastify
 *
 * Registers the AuthService as a Fastify plugin and provides decorators
 * for protecting routes.
 *
 * ## Configuration
 *
 * Set AUTH_PROVIDER environment variable to choose provider:
 * - "jwks" - Validate OIDC access tokens via JWKS (recommended for production)
 * - "forced-user" - Inject a fixed dev user
 * - "none" - Disable authentication; default when AUTH_PROVIDER is unset (development only)
 *
 * ## Usage in Routes
 *
 * Option 1: Protect entire route group
 * ```typescript
 * export default async function routes(fastify: FastifyZodInstance) {
 *   fastify.addHook("onRequest", fastify.requireAuth);
 *   // All routes here require auth
 * }
 * ```
 *
 * Option 2: Protect individual routes
 * ```typescript
 * fastify.get("/protected", {
 *   onRequest: [fastify.requireAuth],
 *   schema: { ... }
 * }, handler);
 * ```
 */

import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../../auth/index.js";

/**
 * Authentication plugin that integrates AuthService with Fastify. The provider
 * is selected from AUTH_PROVIDER at module load (see auth/index.ts).
 */
const authenticationPlugin: FastifyPluginAsync = (fastify) => {
  // Decorate fastify with the auth service
  fastify.decorate("authService", authService);

  /**
   * Decorator to require authentication on a route. Fails with 401 when a
   * private route resolves no user; public routes (allowPublicAccess /
   * allowAnonymousAccess) pass through with a null user. With AUTH_PROVIDER=none
   * the NoneProvider resolves no user, so every private route 401s.
   */
  fastify.decorate(
    "requireAuth",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const routeConfig = request.routeOptions?.config;
      const isPrivateRoute =
        !routeConfig?.allowPublicAccess && !routeConfig?.allowAnonymousAccess;

      const result = await authService.authenticate(request);

      if (!result.user && isPrivateRoute) {
        request.log.warn({ error: result.error }, "Authentication failed");
        return reply.status(401).send({
          code: "UNAUTHORIZED",
          message: result.error,
        });
      }

      // Attach the authenticated user to the request
      request.authUser = result.user;
    }
  );

  fastify.log.info(
    {
      provider: authService.getConfiguredProvider(),
    },
    "Auth plugin registered"
  );

  return Promise.resolve();
};

export default fp(authenticationPlugin, {
  name: "authentication-plugin",
  // Depend on JWT plugin for JWKS provider
  dependencies: ["jwt-plugin"],
});
