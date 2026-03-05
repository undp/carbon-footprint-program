/**
 * @fileoverview Organization Authorization Plugin
 *
 * Provides decorators for checking if authenticated users have required roles
 * within specific organizations.
 * This plugin depends on authorization-plugin and user-resolve-plugin.
 * Prisma is accessed via fastify.prisma (loaded alphabetically after this plugin).
 *
 * ## Usage
 *
 * IMPORTANT: Organization role checks must run in preHandler, not onRequest,
 * because they depend on request.currentUser being set by user-resolve-plugin.
 *
 * ```typescript
 * // Define an extractor function
 * const extractOrganizationId = async (request: FastifyRequest) =>
 *   request.params.organizationId;
 *
 * // Require organization admin role
 * fastify.post("/api/organizations/:organizationId/users", {
 *   onRequest: [fastify.requireAuth],
 *   preHandler: [
 *     fastify.requireOrganizationRole(
 *       extractOrganizationId,
 *       [OrganizationRole.ADMIN]
 *     )
 *   ],
 * }, handler);
 * ```
 */

import fp from "fastify-plugin";
import type {
  FastifyPluginCallback,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { OrganizationRole } from "@repo/database/enums";
import { MembershipStatus } from "@repo/database/enums";

/**
 * Function type that extracts the organization ID from a request.
 * Can extract from params, body, query, or nested resources.
 */
export type OrganizationIdExtractor = (
  request: FastifyRequest
) => Promise<string | null | undefined>;

/**
 * Type for organization role checking function.
 */
export type RequireOrganizationRoleFunction = (
  organizationIdExtractor: OrganizationIdExtractor,
  allowedRoles: OrganizationRole[]
) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const organizationAuthorizationPlugin: FastifyPluginCallback = (fastify) => {
  /**
   * Decorator factory that creates a hook to check if user has required roles
   * within an organization.
   *
   * @param organizationIdExtractor - Function to extract organization ID from request
   * @param allowedRoles - Array of organization roles, user must have at least one
   * @returns Fastify hook function
   *
   * @example
   * ```typescript
   * const extractOrgId: OrganizationIdExtractor = async (request) =>
   *   request.params.organizationId;
   *
   * fastify.post("/organizations/:organizationId/users", {
   *   onRequest: [fastify.requireAuth],
   *   preHandler: [
   *     fastify.requireOrganizationRole(
   *       extractOrgId,
   *       [OrganizationRole.ADMIN]
   *     )
   *   ]
   * }, handler);
   * ```
   */
  fastify.decorate(
    "requireOrganizationRole",
    function (
      organizationIdExtractor: OrganizationIdExtractor,
      allowedRoles: OrganizationRole[]
    ) {
      return async function (request: FastifyRequest, reply: FastifyReply) {
        const log = request.log.child({ module: "organization-authorization" });

        // Ensure user is authenticated
        if (!request.authUser) {
          log.warn(
            "Organization authorization check failed: user not authenticated"
          );
          return reply.status(401).send({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Ensure user is resolved from database
        if (!request.currentUser) {
          log.warn(
            { idpUserId: request.authUser.idpUserId },
            "Organization authorization check failed: user not resolved from database"
          );
          return reply.status(500).send({
            code: "INTERNAL_SERVER_ERROR",
            message: "User resolution failed",
          });
        }

        // Extract organization ID from request
        const organizationId = await organizationIdExtractor(request);

        if (!organizationId) {
          log.warn(
            "Organization authorization check failed: organization ID not found"
          );
          return reply.status(400).send({
            code: "BAD_REQUEST",
            message: "Organization ID is required",
          });
        }

        // Query user's membership in the organization
        const membership =
          await fastify.prisma.userOrganizationMembership.findFirst({
            where: {
              userId: BigInt(request.currentUser.id),
              organizationId: BigInt(organizationId),
              status: MembershipStatus.ACTIVE,
            },
          });

        // Check if membership exists
        if (!membership) {
          log.warn(
            {
              userId: request.currentUser.id,
              organizationId,
            },
            "Organization authorization failed: user is not a member of this organization"
          );
          return reply.status(403).send({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        // Check if user has one of the required roles
        const hasRequiredRole = allowedRoles.includes(membership.role);

        if (!hasRequiredRole) {
          log.warn(
            {
              userId: request.currentUser.id,
              organizationId,
              userRole: membership.role,
              requiredRoles: allowedRoles,
            },
            "Organization authorization failed: insufficient permissions"
          );
          return reply.status(403).send({
            code: "FORBIDDEN",
            message: "Insufficient permissions for this organization",
          });
        }

        log.debug(
          {
            userId: request.currentUser.id,
            organizationId,
            userRole: membership.role,
          },
          "Organization authorization successful"
        );
      };
    }
  );

  fastify.log.info("Organization authorization plugin registered");
};

export default fp(organizationAuthorizationPlugin, {
  name: "organization-authorization-plugin",
  dependencies: ["authorization-plugin", "user-resolve-plugin"],
});
