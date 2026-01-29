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

/**
 * User roles enum - to be synced with database schema when implemented.
 * TODO: Update this enum when roles are added to the User schema.
 */
export enum UserRole {
  USER = "user",
  EDITOR = "editor",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
}

/**
 * Type for role checking function.
 */
export type RequireRolesFunction = (
  allowedRoles: UserRole[]
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
   *     fastify.requireRoles([UserRole.ADMIN])
   *   ]
   * }, handler);
   * ```
   */
  fastify.decorate("requireRoles", function (allowedRoles: UserRole[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      const log = request.log.child({ module: "authorization" });

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

      // TODO: Implement actual role checking when User schema has roles
      // For now, this is a placeholder that logs the authorization attempt
      log.info(
        {
          userId: request.currentUser.id,
          requiredRoles: allowedRoles,
          // userRoles: request.currentUser.roles, // TODO: Uncomment when schema has roles
        },
        "Role authorization check (placeholder - always passes)"
      );

      // PLACEHOLDER: Always allow for now
      // TODO: Replace with actual role checking:
      // const userRoles = request.currentUser.roles || [];
      // const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
      //
      // if (!hasRequiredRole) {
      //   log.warn(
      //     {
      //       userId: request.currentUser.id,
      //       userRoles,
      //       requiredRoles: allowedRoles,
      //     },
      //     "Authorization failed: insufficient permissions"
      //   );
      //   return reply.status(403).send({
      //     code: "FORBIDDEN",
      //     message: "Insufficient permissions",
      //   });
      // }
      //
      // log.debug({ userId: request.currentUser.id }, "Authorization successful");
    };
  });

  fastify.log.info("Authorization plugin registered");
};

export default fp(authorizationPlugin, {
  name: "authorization-plugin",
  dependencies: ["authentication-plugin", "user-resolve-plugin"],
});
