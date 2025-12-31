import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryMethodologyHandler } from "./getCarbonInventoryMethodologyHandler.js";
import { GetCarbonInventoryMethodologyResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The carbon inventory ID"),
});

export const getCarbonInventoryMethodologyRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/:id/methodology",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get methodology for carbon inventory",
        description:
          "Retrieves the methodology associated with a given carbon inventory, including all its categories, subcategories, dimensions, dimension values, and emission factors.",
        params: ParamsSchema,
        response: {
          200: GetCarbonInventoryMethodologyResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getCarbonInventoryMethodologyHandler
  );
};
