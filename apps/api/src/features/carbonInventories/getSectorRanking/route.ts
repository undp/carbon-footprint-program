import type { FastifyZodInstance } from "@/types/fastify.js";
import { getSectorRankingHandler } from "./handler.js";
import { IdSchema, GetSectorRankingResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getSectorRankingRoute = (fastify: FastifyZodInstance) => {
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
    },
    getSectorRankingHandler
  );
};
