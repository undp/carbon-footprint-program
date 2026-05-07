import { getEmissionFactorsHandler } from "./handler.js";
import {
  GetEmissionFactorsParams,
  GetEmissionFactorsParamsSchema,
  GetEmissionFactorsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getEmissionFactorsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetEmissionFactorsParams }>(
    "/:id/emission-factors",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get emission factors used in inventory",
        description:
          "Retrieves all emission factors used in the inventory, including category/subcategory info, activity parameters, gas breakdown, and factor sources.",
        params: GetEmissionFactorsParamsSchema,
        response: {
          200: GetEmissionFactorsResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          canAdminsBypass: true,
        }),
      ],
    },
    getEmissionFactorsHandler
  );
};
