import { getMainActivityEquivalenceHandler } from "./handler.js";
import {
  GetMainActivityEquivalenceParams,
  GetMainActivityEquivalenceParamsSchema,
  GetMainActivityEquivalenceResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getMainActivityEquivalenceRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetMainActivityEquivalenceParams }>(
    "/:id/main-activity-equivalence",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get main activity equivalence",
        description:
          "Retrieves the emission rate per main activity unit for a carbon inventory. Returns null if main activity data is not defined.",
        params: GetMainActivityEquivalenceParamsSchema,
        response: {
          200: GetMainActivityEquivalenceResponseSchema,
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
    getMainActivityEquivalenceHandler
  );
};
