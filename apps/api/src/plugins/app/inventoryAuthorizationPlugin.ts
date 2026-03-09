import fp from "fastify-plugin";
import type {
  FastifyPluginCallback,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { isCarbonInventoryEditable } from "@repo/utils";
import {
  CarbonInventoryNotFoundError,
  CarbonInventoryNotEditableError,
} from "@/features/carbonInventories/errors.js";
import { calculateDisplayStatus } from "@/features/carbonInventories/helpers.js";

export type InventoryIdExtractor = (request: FastifyRequest) => Promise<string>;

const inventoryAuthorizationPlugin: FastifyPluginCallback = (fastify) => {
  fastify.decorate(
    "requireEditableInventory",
    function (inventoryIdExtractor: InventoryIdExtractor) {
      return async function (request: FastifyRequest, _reply: FastifyReply) {
        const inventoryId = await inventoryIdExtractor(request);

        const inventory = await fastify.prisma.carbonInventory.findUnique({
          where: { id: BigInt(inventoryId) },
          include: {
            submission: {
              include: {
                subject: {
                  include: {
                    submissions: {
                      select: {
                        id: true,
                        status: true,
                        type: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!inventory) {
          throw new CarbonInventoryNotFoundError(inventoryId);
        }

        const status = calculateDisplayStatus(inventory);

        if (!isCarbonInventoryEditable(status)) {
          throw new CarbonInventoryNotEditableError(inventoryId, status);
        }
      };
    }
  );

  fastify.log.info("Inventory authorization plugin registered");
};

export default fp(inventoryAuthorizationPlugin, {
  name: "inventory-authorization-plugin",
  dependencies: ["prisma-plugin"],
});
