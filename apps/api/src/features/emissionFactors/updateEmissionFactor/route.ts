import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateEmissionFactorHandler } from "./handler.js";
import {
  UpdateEmissionFactorParamsSchema,
  UpdateEmissionFactorRequestSchema,
  UpdateEmissionFactorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateEmissionFactorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateEmissionFactorHandler
  );
};
