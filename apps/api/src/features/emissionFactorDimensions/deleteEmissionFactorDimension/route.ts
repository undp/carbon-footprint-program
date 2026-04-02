import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteEmissionFactorDimensionHandler } from "./handler.js";
import { DeleteEmissionFactorDimensionParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteEmissionFactorDimensionRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["emission-factor-dimensions"],
        summary: "Delete an emission factor dimension",
        description:
          "Delete a dimension and soft-delete all associated emission factors",
        params: DeleteEmissionFactorDimensionParamsSchema,
        response: {
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteEmissionFactorDimensionHandler
  );
};
