import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateEmissionFactorDimensionHandler } from "./handler.js";
import {
  UpdateEmissionFactorDimensionParamsSchema,
  UpdateEmissionFactorDimensionRequestSchema,
  UpdateEmissionFactorDimensionResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateEmissionFactorDimensionRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["emission-factor-dimensions"],
        summary: "Update an emission factor dimension",
        description:
          "Update dimension metadata and/or add/remove dimension values",
        params: UpdateEmissionFactorDimensionParamsSchema,
        body: UpdateEmissionFactorDimensionRequestSchema,
        response: {
          200: UpdateEmissionFactorDimensionResponseSchema,
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
    updateEmissionFactorDimensionHandler
  );
};
