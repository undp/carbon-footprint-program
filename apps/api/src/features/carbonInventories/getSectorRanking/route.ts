import { getSectorRankingHandler } from "./handler.js";
import {
  GetSectorRankingParams,
  GetSectorRankingParamsSchema,
  GetSectorRankingResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getSectorRankingRoute = defineRoute<{
  Params: GetSectorRankingParams;
}>({
  method: "GET",
  path: "/:id/sector-ranking",
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
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getSectorRankingHandler,
});
