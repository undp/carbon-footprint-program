import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateCarbonInventorySubcategoriesHandler } from "./handler.js";
import {
  IdSchema,
  UpdateCarbonInventorySubcategoriesRequestSchema,
  UpdateCarbonInventorySubcategoriesResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const UpdateCarbonInventorySubcategoriesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const updateCarbonInventorySubcategoriesRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.patch(
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
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    updateCarbonInventorySubcategoriesHandler
  );
};
