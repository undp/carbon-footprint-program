import { getSuggestedReductionPlanHandler } from "./handler.js";
import {
  GetSuggestedReductionPlanParams,
  GetSuggestedReductionPlanParamsSchema,
  GetSuggestedReductionPlanResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const getSuggestedReductionPlanRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetSuggestedReductionPlanParams }>(
    "/:id/suggested-reduction-plan",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get suggested reduction plan",
        description:
          "Retrieves a suggested emissions reduction plan for a carbon inventory.",
        params: GetSuggestedReductionPlanParamsSchema,
        response: {
          200: GetSuggestedReductionPlanResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    getSuggestedReductionPlanHandler
  );
};
