import type { FastifyZodInstance } from "@/types/fastify.js";
import { addSubcategoriesToCarbonInventoryHandler } from "./handler.js";
import {
  IdSchema,
  AddSubcategoriesToCarbonInventoryBodySchema,
  AddSubcategoriesToCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const AddSubcategoriesToCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const addSubcategoriesToCarbonInventoryRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/:id/subcategories/add",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Add subcategories to a carbon inventory",
        description:
          "Add one or more subcategories to a carbon inventory by creating empty ACTIVE lines. Ignores subcategories that already have ACTIVE lines.",
        params: AddSubcategoriesToCarbonInventoryParamsSchema,
        body: AddSubcategoriesToCarbonInventoryBodySchema,
        response: {
          200: AddSubcategoriesToCarbonInventoryResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    addSubcategoriesToCarbonInventoryHandler
  );
};
