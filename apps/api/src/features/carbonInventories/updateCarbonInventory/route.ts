import { updateCarbonInventoryHandler } from "./handler.js";
import {
  UpdateCarbonInventoryParamsSchema,
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
  type UpdateCarbonInventoryRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import type { FastifyRequest } from "fastify";
import type { UpdateCarbonInventoryParams } from "@repo/types";

const extractCarbonInventoryId = async (request: FastifyRequest) =>
  Promise.resolve((request.params as UpdateCarbonInventoryParams).id);

export const updateCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateCarbonInventoryParams;
    Body: UpdateCarbonInventoryRequest;
  }>(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update a carbon inventory",
        description:
          "Update any attributes of an existing carbon inventory by ID",
        params: UpdateCarbonInventoryParamsSchema,
        body: UpdateCarbonInventoryRequestSchema,
        response: {
          200: UpdateCarbonInventoryResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [fastify.requireEditableInventory(extractCarbonInventoryId)],
      config: {
        public: options?.public ?? false,
      },
    },
    updateCarbonInventoryHandler
  );
};
