import { getCarbonInventorySubcategoriesSummaryHandler } from "./handler.js";
import {
  GetCarbonInventorySubcategoriesSummaryParams,
  GetCarbonInventorySubcategoriesSummaryParamsSchema,
  GetCarbonInventorySubcategoriesSummaryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventorySubcategoriesSummaryRoute: StandardRouteSignature =
  (fastify, options) => {
    fastify.get<{ Params: GetCarbonInventorySubcategoriesSummaryParams }>(
      "/:id/subcategories/summary",
      {
        schema: {
          tags: ["carbon-inventories"],
          summary: "Get subcategories summary for carbon inventory",
          description:
            "Retrieves the summary status of all subcategories for a given carbon inventory, indicating which subcategories have active lines and which lines have been edited.",
          params: GetCarbonInventorySubcategoriesSummaryParamsSchema,
          response: {
            200: GetCarbonInventorySubcategoriesSummaryResponseSchema,
            403: ApiErrorResponseSchema,
            404: ApiErrorResponseSchema,
            500: ApiErrorResponseSchema,
          },
        },
        config: {
          public: options?.public ?? false,
          allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
        },
        preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)],
      },
      getCarbonInventorySubcategoriesSummaryHandler
    );
  };
