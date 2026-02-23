import { getSectorRankingHandler } from "./handler.js";
import { IdSchema, GetSectorRankingResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getSectorRankingRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:id/sector-ranking",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get sector ranking",
        description:
          "Retrieves subcategories ranked by descending emissions for sector comparison.",
        params: ParamsSchema,
        response: {
          200: GetSectorRankingResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getSectorRankingHandler
  );
};
