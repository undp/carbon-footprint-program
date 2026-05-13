import { defineRoute } from "@/routing/defineRoute.js";
import { deleteEmissionFactorDimensionHandler } from "./handler.js";
import {
  DeleteEmissionFactorDimensionParams,
  DeleteEmissionFactorDimensionParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteEmissionFactorDimensionRoute = defineRoute<{
  Params: DeleteEmissionFactorDimensionParams;
}>({
  method: "DELETE",
  path: "/:id",
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
  access: { mode: "private" },
  handler: deleteEmissionFactorDimensionHandler,
});
