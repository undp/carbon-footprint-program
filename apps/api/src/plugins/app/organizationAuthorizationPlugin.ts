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
import { MembershipStatus, SystemRole } from "@repo/database/enums";

/**
 * Function type that extracts the organization ID from a request.
 * Can extract from params, body, query, or nested resources.
 *
 * @typeParam P - The params type for the request (e.g. `{ organizationId: string }`)
 */
export type OrganizationIdExtractor<
  P extends Record<string, string> = Record<string, string>,
> = (request: FastifyRequest<{ Params: P }>) => string | null | undefined;

/**
 * Function type that extracts the organization ID from a request body.
 *
 * @typeParam B - The body type for the request (e.g. `{ organizationId: string }`)
 */
export type BodyOrganizationIdExtractor<
  B extends Record<string, unknown> = Record<string, unknown>,
> = (request: FastifyRequest<{ Body: B }>) => string | null | undefined;

/**
 * Generic extractor type accepted by requireOrganizationRole.
 * Covers both params-based and body-based extraction.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type OrganizationIdExtractorFn = (
  request: FastifyRequest<any>
) => string | null | undefined;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Options for the requireOrganizationRole function.
 */
export type RequireOrganizationRoleOptions = {
  allowedRoles: OrganizationRole[];
  /**
   * When true, users with ADMIN or SUPERADMIN system roles bypass
   * organization membership checks entirely.
   */
  canAdminsBypass?: boolean;
};

/**
 * Type for organization role checking function.
 */
export type RequireOrganizationRoleFunction = (
  organizationIdExtractor: OrganizationIdExtractorFn,
  options: RequireOrganizationRoleOptions
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
      organizationIdExtractor: OrganizationIdExtractorFn,
      options: RequireOrganizationRoleOptions
    ) {
      const { allowedRoles, canAdminsBypass } = options;

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

        // Bypass organization checks for ADMIN and SUPERADMIN system roles
        if (
          canAdminsBypass &&
          (request.currentUser.role === SystemRole.ADMIN ||
            request.currentUser.role === SystemRole.SUPERADMIN)
        ) {
          log.debug(
            {
              userId: request.currentUser.id,
              systemRole: request.currentUser.role,
            },
            "Organization authorization bypassed for system admin"
          );
          return;
        }

        // Extract organization ID from request
        const organizationId = organizationIdExtractor(request);

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
