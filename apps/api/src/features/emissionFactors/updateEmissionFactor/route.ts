import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateEmissionFactorHandler } from "./handler.js";
import {
  UpdateEmissionFactorParamsSchema,
  UpdateEmissionFactorRequestSchema,
  UpdateEmissionFactorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateEmissionFactorRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["emission-factors"],
        summary: "Update an emission factor",
        description: "Update an existing emission factor by its ID",
        params: UpdateEmissionFactorParamsSchema,
        body: UpdateEmissionFactorRequestSchema,
        response: {
          200: UpdateEmissionFactorResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    updateEmissionFactorHandler
  );
};
