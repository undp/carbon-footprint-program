import type { FastifyZodInstance } from "@/types/fastify.js";
import { createEmissionFactorDimensionHandler } from "./handler.js";
import {
  CreateEmissionFactorDimensionRequestSchema,
  CreateEmissionFactorDimensionResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createEmissionFactorDimensionRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["emission-factor-dimensions"],
        summary: "Create an emission factor dimension",
        description:
          "Create a new dimension with initial values for a subcategory",
        body: CreateEmissionFactorDimensionRequestSchema,
        response: {
          201: CreateEmissionFactorDimensionResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    createEmissionFactorDimensionHandler
  );
};
