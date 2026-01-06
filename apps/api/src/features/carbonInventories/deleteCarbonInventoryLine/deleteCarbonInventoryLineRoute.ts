import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteCarbonInventoryLineHandler } from "./deleteCarbonInventoryLineHandler.js";
import { IdSchema, DeleteCarbonInventoryLineResponseSchema } from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
  ErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

export const DeleteCarbonInventoryLineParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
  subcategoryId: z.string().regex(/^\d+$/).describe("The subcategory ID"),
  lineId: z.string().regex(/^\d+$/).describe("The line ID"),
});

export const deleteCarbonInventoryLineRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id/subcategories/:subcategoryId/lines/:lineId",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Delete a carbon inventory line",
        description:
          "Soft delete a line for a given subcategory in a carbon inventory by changing its status to DELETED",
        params: DeleteCarbonInventoryLineParamsSchema,
        response: {
          200: DeleteCarbonInventoryLineResponseSchema,
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    deleteCarbonInventoryLineHandler
  );
};
