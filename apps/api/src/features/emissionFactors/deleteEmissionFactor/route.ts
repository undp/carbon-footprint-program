import { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteEmissionFactorHandler } from "./handler.js";
import { DeleteEmissionFactorParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteEmissionFactorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["emission-factors"],
        summary: "Delete an emission factor",
        description: "Soft-delete an emission factor by its ID",
        params: DeleteEmissionFactorParamsSchema,
        response: {
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteEmissionFactorHandler
  );
};
