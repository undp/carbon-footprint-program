import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteEmissionFactorHandler } from "./handler.js";
import { DeleteEmissionFactorParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteEmissionFactorRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["emission-factors"],
        summary: "Delete an emission factor",
        description: "Soft-delete an emission factor by its ID",
        params: DeleteEmissionFactorParamsSchema,
        responses: {
          200: null,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteEmissionFactorHandler
  );
};
