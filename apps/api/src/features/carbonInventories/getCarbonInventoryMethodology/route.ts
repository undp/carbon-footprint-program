import { getCarbonInventoryMethodologyHandler } from "./handler.js";
import {
  GetCarbonInventoryMethodologyParams,
  GetCarbonInventoryMethodologyParamsSchema,
  GetCarbonInventoryMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventoryMethodologyRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetCarbonInventoryMethodologyParams }>(
    "/:id/methodology",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get methodology for carbon inventory",
        description:
          "Retrieves the methodology associated with a given carbon inventory, including all its categories, subcategories, dimensions, dimension values, and emission factors.",
        params: GetCarbonInventoryMethodologyParamsSchema,
        response: {
          200: GetCarbonInventoryMethodologyResponseSchema,
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
    getCarbonInventoryMethodologyHandler
  );
};
