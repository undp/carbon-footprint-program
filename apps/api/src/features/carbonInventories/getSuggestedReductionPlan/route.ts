import type { FastifyZodInstance } from "@/types/fastify.js";
import { getSuggestedReductionPlanHandler } from "./handler.js";
import { IdSchema, GetSuggestedReductionPlanResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getSuggestedReductionPlanRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id/suggested-reduction-plan",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get suggested reduction plan",
        description:
          "Retrieves a suggested emissions reduction plan for a carbon inventory.",
        params: ParamsSchema,
        response: {
          200: GetSuggestedReductionPlanResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getSuggestedReductionPlanHandler
  );
};
