import { StandardRouteSignature } from "@/routes/api/index.js";
import { getEmissionFactorDimensionsHandler } from "./handler.js";
import {
  GetEmissionFactorDimensionsQuerySchema,
  GetEmissionFactorDimensionsResponseSchema,
} from "@repo/types";

export const getEmissionFactorDimensionsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["emission-factor-dimensions"],
        summary: "Get emission factor dimensions for a methodology version",
        description:
          "Get all dimension configurations per subcategory for a methodology version",
        querystring: GetEmissionFactorDimensionsQuerySchema,
        response: {
          200: GetEmissionFactorDimensionsResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getEmissionFactorDimensionsHandler
  );
};
