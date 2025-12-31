import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventorySubcategoriesSummaryHandler } from "./getCarbonInventorySubcategoriesSummaryHandler.js";
import { GetCarbonInventorySubcategoriesSummaryResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The carbon inventory ID"),
});

export const getCarbonInventorySubcategoriesSummaryRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/:id/subcategories/summary",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get subcategories summary for carbon inventory",
        description:
          "Retrieves the summary status of all subcategories for a given carbon inventory, indicating which subcategories have active lines and which lines have been edited.",
        params: ParamsSchema,
        response: {
          200: GetCarbonInventorySubcategoriesSummaryResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getCarbonInventorySubcategoriesSummaryHandler
  );
};
