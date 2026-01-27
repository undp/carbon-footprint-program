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
import { AuthService } from "../../auth/AuthService.js";
import type { AuthProviderType, AuthConfig } from "../../auth/types.js";
import { AUTH_PROVIDER } from "@/config/environment.js";

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
  options
) => {
  // Create config from environment with option overrides
  const provider = options.provider ?? AUTH_PROVIDER;
  const config: AuthConfig = {
    provider,
    enabled: Boolean(provider !== "none"),
  };

  // Create the auth service
  const authService = new AuthService(config);

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
      if (request.routeOptions?.config?.public) {
        request.log.debug("Route marked as public; skipping authentication");
        return;
      }

      // Skip authentication if provider is none (development mode)
      if (!authService.isEnabled() || config.provider === "none") {
        request.log.debug(
          { provider: config.provider },
          "Authentication disabled; allowing request without auth"
        );
        return;
      }

      const result = await authService.authenticate(request);

      if (!result.success || !result.user) {
        request.log.warn({ error: result.error }, "Authentication failed");
        return reply.status(401).send({
          code: "UNAUTHORIZED",
          message: result.error || "Authentication required",
        });
      }

      // Attach the authenticated user to the request
      request.authUser = result.user;
      request.log.debug(
        { idpUserId: result.user.idpUserId },
        "User authenticated"
      );
    }
  );

  fastify.log.info(
    { provider: config.provider, enabled: config.enabled },
    "Auth plugin registered"
  );

  return Promise.resolve();
};

export default fp(authenticationPlugin, {
  name: "authentication-plugin",
  // Depend on JWT plugin for JWKS provider
  dependencies: ["jwt-plugin"],
});
