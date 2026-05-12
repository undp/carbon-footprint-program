import { getReductionPlanHandler } from "./handler.js";
import {
  GetReductionPlanParamsSchema,
  GetReductionPlanResponseSchema,
} from "@repo/types";
import type { GetReductionPlanParams } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getReductionPlanRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetReductionPlanParams }>(
    "/:id/reduction-plan",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get reduction plan by category",
        description:
          "Retrieves initiatives grouped by subcategory for a carbon inventory's reduction plan.",
        params: GetReductionPlanParamsSchema,
        response: {
          200: GetReductionPlanResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)],
    },
    getReductionPlanHandler
  );
};
