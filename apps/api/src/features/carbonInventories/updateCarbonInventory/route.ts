import { updateCarbonInventoryHandler } from "./handler.js";
import {
  UpdateCarbonInventoryParamsSchema,
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
  type UpdateCarbonInventoryRequest,
  type UpdateCarbonInventoryParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

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
      config: {
        public: options?.public ?? false,
      },
    },
    updateCarbonInventoryHandler
  );
};
