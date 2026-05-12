import { getSuggestedReductionPlanHandler } from "./handler.js";
import {
  GetSuggestedReductionPlanParams,
  GetSuggestedReductionPlanParamsSchema,
  GetSuggestedReductionPlanQuery,
  GetSuggestedReductionPlanQuerySchema,
  GetSuggestedReductionPlanResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getSuggestedReductionPlanRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: GetSuggestedReductionPlanParams;
    Querystring: GetSuggestedReductionPlanQuery;
  }>(
    "/:id/suggested-reduction-plan",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get suggested reduction plan",
        description:
          "Retrieves the top N reduction initiatives for a carbon inventory, ranked by the emissions contribution of each initiative's subcategory.",
        params: GetSuggestedReductionPlanParamsSchema,
        querystring: GetSuggestedReductionPlanQuerySchema,
        response: {
          200: GetSuggestedReductionPlanResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          canAdminsBypass: true,
        }),
      ],
    },
    getSuggestedReductionPlanHandler
  );
};
