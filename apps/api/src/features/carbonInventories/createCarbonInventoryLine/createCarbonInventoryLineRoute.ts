import type { FastifyZodInstance } from "@/types/fastify.js";
import { createCarbonInventoryLineHandler } from "./createCarbonInventoryLineHandler.js";
import { CreateCarbonInventoryLineResponseSchema } from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const CreateCarbonInventoryLineParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The carbon inventory ID"),
  subcategoryId: z.string().regex(/^\d+$/).describe("The subcategory ID"),
});

export const createCarbonInventoryLineRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/:id/subcategories/:subcategoryId/lines",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Create a new carbon inventory line",
        description:
          "Create a new empty line for a given subcategory in a carbon inventory and return its ID",
        params: CreateCarbonInventoryLineParamsSchema,
        response: {
          201: CreateCarbonInventoryLineResponseSchema,
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    createCarbonInventoryLineHandler
  );
};
