import type { FastifyZodInstance } from "@/types/fastify.js";
import { getEmissionsSummaryFullHandler } from "./handler.js";
import { IdSchema, GetEmissionsSummaryFullResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getEmissionsSummaryFullRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id/emissions-summary/full",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get full emissions summary for inventory review",
        description:
          "Retrieves comprehensive emissions summary including inventory attributes, category/subcategory breakdown with emission lines, GHG gas breakdown, and equivalence data.",
        params: ParamsSchema,
        response: {
          200: GetEmissionsSummaryFullResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getEmissionsSummaryFullHandler
  );
};
