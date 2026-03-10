import type { FastifyZodInstance } from "@/types/fastify.js";
import { getEmissionFactorDimensionsHandler } from "./handler.js";
import {
  GetEmissionFactorDimensionsQuerySchema,
  GetEmissionFactorDimensionsResponseSchema,
} from "@repo/types";

export const getEmissionFactorDimensionsRoute = (
  fastify: FastifyZodInstance
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
    },
    getEmissionFactorDimensionsHandler
  );
};
