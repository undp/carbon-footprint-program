import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventorySubcategoriesSummaryHandler } from "./handler.js";
import {
  IdSchema,
  GetCarbonInventorySubcategoriesSummaryResponseSchema,
} from "@repo/types";
import {
  ErrorResponseSchema,
  NotFoundErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
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
          500: ErrorResponseSchema,
        },
      },
    },
    getCarbonInventorySubcategoriesSummaryHandler
  );
};
