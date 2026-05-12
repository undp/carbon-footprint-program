/**
 * @fileoverview Authentication Plugin for Fastify
 *
 * Registers the AuthService as a Fastify plugin and provides decorators
 * for protecting routes.
 *
 * ## Configuration
 *
 * Set AUTH_PROVIDER environment variable to choose provider:
 * - "jwks" - Use JWT tokens with JWKS validation (default)
 * - "easy-auth" - Use Azure App Service Easy Auth
 * - "none" - Disable authentication (development only)
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
import type { AuthProviderType } from "../../auth/types.js";
import { authService } from "../../auth/index.js";

/**
 * Plugin options for authentication.
 */
export interface AuthPluginOptions {
  /** Override the default provider from environment */
  provider?: AuthProviderType;
}

/**
 * Authentication plugin that integrates AuthService with Fastify.
 */
const authenticationPlugin: FastifyPluginAsync<AuthPluginOptions> = (
  fastify,
  _options
) => {
  // Decorate fastify with the auth service
  fastify.decorate("authService", authService);

  /**
   * Decorator to require authentication on a route.
   * Fails with 401 if authentication fails.
   * Skips authentication if AUTH_PROVIDER=none (development mode).
   */
  fastify.decorate(
    "requireAuth",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const routeConfig = request.routeOptions?.config;
      const isPrivateRoute =
        !routeConfig?.allowPublicAccess && !routeConfig?.allowAnonymousAccess;
      // Skip authentication if provider is none (development mode)
      if (!authService.isEnabled()) {
        request.log.debug(
          { provider: authService.getConfiguredProvider() },
          "Authentication disabled; allowing request without auth"
        );
        return;
      }

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
