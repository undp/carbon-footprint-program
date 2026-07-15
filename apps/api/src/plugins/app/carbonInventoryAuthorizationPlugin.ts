/**
 * @fileoverview Carbon Inventory Authorization Plugin
 *
 * Provides a decorator for checking if a user has access to a specific
 * carbon inventory.
 *
 * Access rules (evaluated in order):
 * a) Anonymous user: access is granted if the request includes an
 *    `x-carbon-inventory-uuid` header whose value matches the inventory's UUID.
 * b) Inventory without organization: only the creator has access.
 * c) Inventory with organization: only active org members have access.
 *    If `requiredOrganizationRoles` is specified, the member's role must
 *    be included in that list; otherwise any active membership suffices.
 *
 * This plugin depends on authorization-plugin and user-resolve-plugin.
 * Prisma is accessed via fastify.prisma (loaded alphabetically after this plugin).
 *
 * ## Usage
 *
 * IMPORTANT: Carbon inventory access checks must run in preHandler, not onRequest,
 * because they depend on request.currentUser being set by user-resolve-plugin.
 *
 * ```typescript
 * import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
 *
 * // Basic access check (any org member or creator):
 * fastify.get("/:id", {
 *   onRequest: [fastify.requireAuth],
 *   preHandler: [
 *     fastify.requireCarbonInventoryAccess(idRequestExtractor)
 *   ],
 * }, handler);
 *
 * // Restricted to specific organization roles:
 * fastify.put("/:id", {
 *   onRequest: [fastify.requireAuth],
 *   preHandler: [
 *     fastify.requireCarbonInventoryAccess(idRequestExtractor, {
 *       requiredOrganizationRoles: [OrganizationRole.ADMIN],
 *     })
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
import { InventoryStatus } from "@repo/types";
import { IdExtractor } from "@/helpers/idRequestExtractor.js";

/**
 * Options for the requireCarbonInventoryAccess function.
 */
export type RequireCarbonInventoryAccessOptions = {
  requiredOrganizationRoles?: OrganizationRole[];
  /**
   * When true, users with ADMIN or SUPERADMIN system roles bypass
   * inventory creator and organization membership checks entirely.
   */
  canAdminsBypass?: boolean;
};

/**
 * Type for carbon inventory access checking function.
 */
export type RequireCarbonInventoryAccessFunction = <
  P extends Record<string, string>,
>(
  carbonInventoryIdExtractor: IdExtractor<P>,
  options?: RequireCarbonInventoryAccessOptions
) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const carbonInventoryAuthorizationPlugin: FastifyPluginCallback = (fastify) => {
  /**
   * Decorator factory that creates a hook to check if user has access
   * to a carbon inventory.
   *
   * Access rules (evaluated in order):
   * a) Anonymous user: access granted via `x-carbon-inventory-uuid` header matching.
   * b) Inventory without organization: only the creator has access.
   * c) Inventory with organization: only active org members have access.
   *    When `requiredOrganizationRoles` is provided, the member's role
   *    must be in that list or a 403 is returned.
   *
   * @param carbonInventoryIdExtractor - Function to extract carbon inventory ID from request
   * @param options - Optional configuration
   * @param options.requiredOrganizationRoles - If set, restricts access to org members with one of these roles
   * @returns Fastify hook function
   */
  fastify.decorate("requireCarbonInventoryAccess", function <
    P extends Record<string, string>,
  >(carbonInventoryIdExtractor: IdExtractor<P>, options?: RequireCarbonInventoryAccessOptions) {
    const requiredOrganizationRoles = options?.requiredOrganizationRoles;
    const canAdminsBypass = options?.canAdminsBypass;

    return async function (request: FastifyRequest, reply: FastifyReply) {
      const log = request.log.child({
        module: "carbon-inventory-authorization",
      });

      // The extractor is supplied per-route and knows its own Params shape;
      // the inner hook is generic over RouteGenericInterface so it can be
      // assigned to `preHandlerAsyncHookHandler` without contravariance issues.
      const carbonInventoryId = carbonInventoryIdExtractor(
        request as FastifyRequest<{ Params: P }>
      );

      /* v8 ignore next -- unreachable: every route wiring this hook supplies :id via idRequestExtractor */
      if (!carbonInventoryId) {
        log.warn(
          "Carbon inventory authorization check failed: carbon inventory ID not found"
        );
        return reply.status(400).send({
          code: "BAD_REQUEST",
          message: "Carbon inventory ID is required",
        });
      }

      const isAuthenticated = !!request.authUser;

      // For authenticated requests, ensure user is resolved from database
      /* v8 ignore next -- unreachable: user-resolve-plugin always resolves currentUser for an authenticated request */
      if (isAuthenticated && !request.currentUser) {
        log.warn(
          { idpUserId: request.authUser!.idpUserId },
          "Carbon inventory authorization check failed: user not resolved from database"
        );
        return reply.status(500).send({
          code: "INTERNAL_SERVER_ERROR",
          message: "User resolution failed",
        });
      }

      const userId = request.currentUser
        ? BigInt(request.currentUser.id)
        : null;

      // Fetch the inventory with organization membership info
      const inventory = await fastify.prisma.carbonInventory.findFirst({
        where: {
          id: BigInt(carbonInventoryId),
        },
        select: {
          id: true,
          uuid: true,
          status: true,
          createdById: true,
          organizationId: true,
          organization: {
            select: {
              memberships: {
                where: {
                  ...(userId ? { userId } : { userId: -1n }),
                  status: MembershipStatus.ACTIVE,
                },
                select: { role: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!inventory || inventory.status === InventoryStatus.DELETED) {
        log.warn(
          {
            userId: request.currentUser?.id,
            carbonInventoryId,
          },
          "Carbon inventory authorization failed: inventory not found or deleted"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this carbon inventory",
        });
      }

      // Access rule a) Anonymous user: UUID matching
      if (!isAuthenticated) {
        const headerUuid = request.headers["x-carbon-inventory-uuid"];
        if (typeof headerUuid === "string" && headerUuid === inventory.uuid) {
          log.debug(
            { carbonInventoryId },
            "Carbon inventory authorization successful via UUID"
          );
          return;
        }

        log.warn(
          { carbonInventoryId },
          "Carbon inventory authorization failed: anonymous access denied"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this carbon inventory",
        });
      }

      // Bypass inventory access checks for ADMIN and SUPERADMIN system roles
      if (
        canAdminsBypass &&
        request.currentUser &&
        (request.currentUser.role === SystemRole.ADMIN ||
          request.currentUser.role === SystemRole.SUPERADMIN)
      ) {
        log.debug(
          {
            userId: request.currentUser.id,
            systemRole: request.currentUser.role,
            carbonInventoryId,
          },
          "Carbon inventory authorization bypassed for system admin"
        );
        return;
      }

      const membership = inventory.organization?.memberships?.[0];

      // Access rule b) Inventory without organization: only the creator has access
      if (!inventory.organizationId && inventory.createdById !== userId) {
        log.warn(
          {
            userId: request.currentUser!.id,
            carbonInventoryId,
          },
          "Carbon inventory authorization failed: user is not the creator of this standalone inventory"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this carbon inventory",
        });
      }

      // Access rule c) Inventory with organization: only active org members have access
      if (inventory.organizationId && !membership) {
        log.warn(
          {
            userId: request.currentUser!.id,
            carbonInventoryId,
            organizationId: inventory.organizationId.toString(),
          },
          "Carbon inventory authorization failed: user is not a member of the inventory's organization"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this carbon inventory",
        });
      }

      // Check organization role if required
      if (
        inventory.organizationId &&
        membership &&
        requiredOrganizationRoles &&
        requiredOrganizationRoles.length > 0 &&
        !requiredOrganizationRoles.includes(membership.role)
      ) {
        log.warn(
          {
            userId: request.currentUser!.id,
            carbonInventoryId,
            organizationId: inventory.organizationId.toString(),
            userRole: membership.role,
            requiredRoles: requiredOrganizationRoles,
          },
          "Carbon inventory authorization failed: insufficient organization permissions"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "Insufficient permissions for this organization",
        });
      }

      log.debug(
        {
          userId: request.currentUser!.id,
          carbonInventoryId,
        },
        "Carbon inventory authorization successful"
      );
    };
  });

  fastify.log.info("Carbon inventory authorization plugin registered");
};

export default fp(carbonInventoryAuthorizationPlugin, {
  name: "carbon-inventory-authorization-plugin",
  dependencies: ["authorization-plugin", "user-resolve-plugin"],
});
