import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryByIdHandler } from "./getCarbonInventoryByIdHandler.js";
import { IdSchema, GetCarbonInventoryByIdResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getCarbonInventoryByIdRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get a carbon inventory by ID",
        description: "Get a single carbon inventory by its ID",
        params: ParamsSchema,
        response: {
          200: GetCarbonInventoryByIdResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getCarbonInventoryByIdHandler
  );
};
