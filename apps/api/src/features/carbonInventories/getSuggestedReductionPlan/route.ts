import { getSuggestedReductionPlanHandler } from "./handler.js";
import { IdSchema, GetSuggestedReductionPlanResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getSuggestedReductionPlanRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
      config: {
        public: options?.public ?? false,
      },
    },
    getSuggestedReductionPlanHandler
  );
};
