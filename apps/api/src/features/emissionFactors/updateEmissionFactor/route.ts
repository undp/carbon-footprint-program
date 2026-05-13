import { defineRoute } from "@/routing/defineRoute.js";
import { updateEmissionFactorHandler } from "./handler.js";
import {
  UpdateEmissionFactorParams,
  UpdateEmissionFactorParamsSchema,
  UpdateEmissionFactorRequest,
  UpdateEmissionFactorRequestSchema,
  UpdateEmissionFactorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateEmissionFactorRoute = defineRoute<{
  Params: UpdateEmissionFactorParams;
  Body: UpdateEmissionFactorRequest;
}>({
  method: "PATCH",
  path: "/:id",
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
  access: { mode: "private" },
  handler: updateEmissionFactorHandler,
});
