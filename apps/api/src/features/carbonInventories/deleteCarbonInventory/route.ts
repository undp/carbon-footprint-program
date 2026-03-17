import { deleteCarbonInventoryHandler } from "./handler.js";
import {
  DeleteCarbonInventoryParamsSchema,
  DeleteCarbonInventoryResponseSchema,
  type DeleteCarbonInventoryParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const deleteCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete<{
    Params: DeleteCarbonInventoryParams;
  }>(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Delete a carbon inventory",
        description:
          "Soft-delete a carbon inventory by ID (sets status to DELETED)",
        params: DeleteCarbonInventoryParamsSchema,
        response: {
          200: DeleteCarbonInventoryResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    deleteCarbonInventoryHandler
  );
};
