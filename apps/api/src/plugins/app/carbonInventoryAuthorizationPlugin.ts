/**
 * @fileoverview Carbon Inventory Authorization Plugin
 *
 * Provides a decorator for checking if authenticated users have access
 * to a specific carbon inventory.
 * Access is granted if the user created the inventory OR has an active
 * membership in the inventory's organization.
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
 * import { extractCarbonInventoryIdFromParams } from "@/features/carbonInventories/carbonInventoryIdExtractors.js";
 *
 * fastify.get("/:id", {
 *   onRequest: [fastify.requireAuth],
 *   preHandler: [
 *     fastify.requireCarbonInventoryAccess(extractCarbonInventoryIdFromParams)
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
import { MembershipStatus } from "@repo/database/enums";
import { InventoryStatus } from "@repo/types";

/**
 * Function type that extracts the carbon inventory ID from a request.
 * Can extract from params, body, query, or nested resources.
 */
export type CarbonInventoryIdExtractor<
  P extends Record<string, string> = Record<string, string>,
> = (request: FastifyRequest<{ Params: P }>) => string | null | undefined;

/**
 * Type for carbon inventory access checking function.
 */
export type RequireCarbonInventoryAccessFunction = <
  P extends Record<string, string>,
>(
  carbonInventoryIdExtractor: CarbonInventoryIdExtractor<P>
) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const carbonInventoryAuthorizationPlugin: FastifyPluginCallback = (fastify) => {
  /**
   * Decorator factory that creates a hook to check if user has access
   * to a carbon inventory.
   *
   * Access is granted if:
   * - The user created the inventory, OR
   * - The user has an active membership in the inventory's organization
   *
   * @param carbonInventoryIdExtractor - Function to extract carbon inventory ID from request
   * @returns Fastify hook function
   */
  fastify.decorate("requireCarbonInventoryAccess", function <
    P extends Record<string, string>,
  >(carbonInventoryIdExtractor: CarbonInventoryIdExtractor<P>) {
    return async function (
      request: FastifyRequest<{ Params: P }>,
      reply: FastifyReply
    ) {
      const log = request.log.child({
        module: "carbon-inventory-authorization",
      });

      // Ensure user is authenticated
      if (!request.authUser) {
        log.warn(
          "Carbon inventory authorization check failed: user not authenticated"
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
          "Carbon inventory authorization check failed: user not resolved from database"
        );
        return reply.status(500).send({
          code: "INTERNAL_SERVER_ERROR",
          message: "User resolution failed",
        });
      }

      // Extract carbon inventory ID from request
      const carbonInventoryId = carbonInventoryIdExtractor(request);

      if (!carbonInventoryId) {
        log.warn(
          "Carbon inventory authorization check failed: carbon inventory ID not found"
        );
        return reply.status(400).send({
          code: "BAD_REQUEST",
          message: "Carbon inventory ID is required",
        });
      }

      const userId = BigInt(request.currentUser.id);

      // Query for a carbon inventory the user has access to (via authorship or org membership)
      const inventory = await fastify.prisma.carbonInventory.findFirst({
        where: {
          id: BigInt(carbonInventoryId),
          OR: [
            { createdById: userId },
            {
              organization: {
                memberships: {
                  some: {
                    userId,
                    status: MembershipStatus.ACTIVE,
                  },
                },
              },
            },
          ],
        },
        select: { id: true, status: true },
      });

      if (!inventory) {
        log.warn(
          {
            userId: request.currentUser.id,
            carbonInventoryId,
          },
          "Carbon inventory authorization failed: user does not have access"
        );
        return reply.status(403).send({
          code: "FORBIDDEN",
          message: "You do not have access to this carbon inventory",
        });
      }

      if (inventory.status === InventoryStatus.DELETED) {
        log.warn(
          {
            userId: request.currentUser.id,
            carbonInventoryId,
          },
          "Carbon inventory authorization failed: inventory is deleted"
        );
        return reply.status(404).send({
          code: "NOT_FOUND",
          message: "Carbon inventory not found",
        });
      }

      log.debug(
        {
          userId: request.currentUser.id,
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
