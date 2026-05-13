import { defineRoute } from "@/routing/defineRoute.js";
import { updateEmissionFactorDimensionHandler } from "./handler.js";
import {
  UpdateEmissionFactorDimensionParams,
  UpdateEmissionFactorDimensionParamsSchema,
  UpdateEmissionFactorDimensionRequest,
  UpdateEmissionFactorDimensionRequestSchema,
  UpdateEmissionFactorDimensionResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateEmissionFactorDimensionRoute = defineRoute<{
  Params: UpdateEmissionFactorDimensionParams;
  Body: UpdateEmissionFactorDimensionRequest;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["emission-factor-dimensions"],
    summary: "Update an emission factor dimension",
    description: "Update dimension metadata and/or add/remove dimension values",
    params: UpdateEmissionFactorDimensionParamsSchema,
    body: UpdateEmissionFactorDimensionRequestSchema,
    response: {
      200: UpdateEmissionFactorDimensionResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateEmissionFactorDimensionHandler,
});
