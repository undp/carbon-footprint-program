import { updateCarbonInventorySubcategoriesHandler } from "./handler.js";
import {
  UpdateCarbonInventorySubcategoriesRequestSchema,
  UpdateCarbonInventorySubcategoriesResponseSchema,
  type UpdateCarbonInventorySubcategoriesRequest,
  UpdateCarbonInventorySubcategoriesParamsSchema,
  UpdateCarbonInventorySubcategoriesParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { FastifyRequest } from "fastify";

const extractCarbonInventoryId = async (
  request: FastifyRequest
): Promise<string> =>
  Promise.resolve(
    (request.params as UpdateCarbonInventorySubcategoriesParams).id
  );

export const updateCarbonInventorySubcategoriesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateCarbonInventorySubcategoriesParams;
    Body: UpdateCarbonInventorySubcategoriesRequest;
  }>(
    "/:id/subcategories",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update subcategories selection for a carbon inventory",
        description:
          "Add or remove subcategories from a carbon inventory. When removing a subcategory, it will only succeed if the subcategory has no non-empty lines. Empty lines will be deleted automatically.",
        params: UpdateCarbonInventorySubcategoriesParamsSchema,
        body: UpdateCarbonInventorySubcategoriesRequestSchema,
        response: {
          200: UpdateCarbonInventorySubcategoriesResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [fastify.requireEditableInventory(extractCarbonInventoryId)],
      config: {
        public: options?.public ?? false,
      },
    },
    updateCarbonInventorySubcategoriesHandler
  );
};
