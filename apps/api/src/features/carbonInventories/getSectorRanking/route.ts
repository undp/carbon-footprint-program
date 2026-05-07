import { getSectorRankingHandler } from "./handler.js";
import {
  GetSectorRankingParams,
  GetSectorRankingParamsSchema,
  GetSectorRankingResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getSectorRankingRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetSectorRankingParams }>(
    "/:id/sector-ranking",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get sector ranking",
        description:
          "Retrieves subcategories ranked by descending emissions for sector comparison.",
        params: GetSectorRankingParamsSchema,
        response: {
          200: GetSectorRankingResponseSchema,
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
    getSectorRankingHandler
  );
};
