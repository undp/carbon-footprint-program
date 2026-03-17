import { getEmissionsSummaryCategoriesHandler } from "./handler.js";
import {
  GetEmissionsSummaryCategoriesParams,
  GetEmissionsSummaryCategoriesParamsSchema,
  GetEmissionsSummaryCategoriesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const getEmissionsSummaryCategoriesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetEmissionsSummaryCategoriesParams }>(
    "/:id/emissions-summary/categories",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get emissions summary by category",
        description:
          "Retrieves emissions totals and percentages grouped by category and subcategory for a carbon inventory.",
        params: GetEmissionsSummaryCategoriesParamsSchema,
        response: {
          200: GetEmissionsSummaryCategoriesResponseSchema,
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
    getEmissionsSummaryCategoriesHandler
  );
};
