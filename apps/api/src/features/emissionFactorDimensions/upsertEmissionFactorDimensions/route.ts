import type { FastifyZodInstance } from "@/types/fastify.js";
import { upsertEmissionFactorDimensionsHandler } from "./handler.js";
import {
  UpsertEmissionFactorDimensionsRequestSchema,
  UpsertEmissionFactorDimensionsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const upsertEmissionFactorDimensionsRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.put(
    "/",
    {
      schema: {
        tags: ["emission-factor-dimensions"],
        summary: "Upsert emission factor dimensions",
        description:
          "Create or update dimension configurations for subcategories",
        body: UpsertEmissionFactorDimensionsRequestSchema,
        response: {
          201: UpsertEmissionFactorDimensionsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    upsertEmissionFactorDimensionsHandler
  );
};
