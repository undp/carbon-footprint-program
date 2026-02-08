import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryResultsHandler } from "./handler.js";
import {
  IdSchema,
  GetCarbonInventoryResultsResponseSchema,
} from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getCarbonInventoryResultsRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/:id/results",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get emission results for a carbon inventory",
        description:
          "Retrieves the emission results for a carbon inventory, including totals by category and subcategory, rankings, equivalence, and a suggested reduction plan.",
        params: ParamsSchema,
        response: {
          200: GetCarbonInventoryResultsResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getCarbonInventoryResultsHandler
  );
};
