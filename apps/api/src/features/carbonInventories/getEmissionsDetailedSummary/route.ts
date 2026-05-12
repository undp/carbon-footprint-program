import { getEmissionsDetailedSummaryHandler } from "./handler.js";
import {
  GetEmissionsDetailedSummaryParams,
  GetEmissionsDetailedSummaryParamsSchema,
  GetEmissionsDetailedSummaryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getEmissionsDetailedSummaryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetEmissionsDetailedSummaryParams }>(
    "/:id/emissions-summary",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get full emissions summary for inventory review",
        description:
          "Retrieves comprehensive emissions summary including inventory attributes, category/subcategory breakdown with emission lines, GHG gas breakdown, and equivalence data.",
        params: GetEmissionsDetailedSummaryParamsSchema,
        response: {
          200: GetEmissionsDetailedSummaryResponseSchema,
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
    getEmissionsDetailedSummaryHandler
  );
};
