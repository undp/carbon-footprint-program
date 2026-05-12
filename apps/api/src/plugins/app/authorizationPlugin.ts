/**
 * @fileoverview Authorization Plugin for Role-Based Access Control (RBAC)
 *
 * Provides decorators for checking if authenticated users have required roles.
 * This plugin depends on the auth-plugin and user-resolve-plugin.
 *
 * ## Usage
 *
 * ```typescript
 * // Require at least one of the specified roles
 * fastify.get("/admin", {
 *   onRequest: [fastify.requireAuth, fastify.requireRoles(["admin", "superadmin"])],
 * }, handler);
 *
 * // Protect entire route group
 * export default async function routes(fastify: FastifyZodInstance) {
 *   fastify.addHook("onRequest", fastify.requireRoles(["editor", "admin"]));
 *   // All routes here require editor or admin role
 * }
 * ```
 */

import fp from "fastify-plugin";
import type {
  FastifyPluginCallback,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { SystemRole } from "@repo/database/enums";

/**
 * Type for role checking function.
 */
export type RequireRolesFunction = (
  allowedRoles: SystemRole[]
) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const authorizationPlugin: FastifyPluginCallback = (fastify) => {
  /**
   * Decorator factory that creates a hook to check if user has required roles.
   *
   * @param allowedRoles - Array of roles, user must have at least one
   * @returns Fastify hook function
   *
   * @example
   * ```typescript
   * fastify.get("/admin-only", {
   *   onRequest: [
   *     fastify.requireAuth,
   *     fastify.requireRoles([SystemRole.ADMIN])
   *   ]
   * }, handler);
   * ```
   */
  fastify.decorate("requireRoles", function (allowedRoles: SystemRole[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      const log = request.log.child({ module: "authorization" });
      const routeConfig = request.routeOptions?.config;
      const isPrivateRoute =
        !routeConfig?.public && !routeConfig?.allowAnonymousAccess;

      if (!isPrivateRoute) {
        log.debug(
          "Public or anonymous-capable route detected; skipping authorization checks"
        );
        return;
      }

      // Ensure user is authenticated
      if (!request.authUser) {
        log.warn("Authorization check failed: user not authenticated");
        return reply.status(401).send({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Ensure user is resolved from database
      if (!request.currentUser) {
        log.warn(
          { idpUserId: request.authUser.idpUserId },
          "Authorization check failed: user not resolved from database"
        );
        return reply.status(500).send({
          code: "INTERNAL_SERVER_ERROR",
          message: "User resolution failed",
        });
      }

      // Check if user has one of the required roles
      const userRole = request.currentUser.role;
      const hasRequiredRole = allowedRoles.includes(userRole);

      if (!hasRequiredRole) {
        log.warn(
          {
            userId: request.currentUser.id,
            userRole,
            requiredRoles: allowedRoles,
          },
          "Authorization failed: insufficient permissions"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      log.debug(
        { userId: request.currentUser.id, userRole },
        "Authorization successful"
      );
    };
  });

  fastify.log.info("Authorization plugin registered");
};

export default fp(authorizationPlugin, {
  name: "authorization-plugin",
  dependencies: ["authentication-plugin", "user-resolve-plugin"],
});
