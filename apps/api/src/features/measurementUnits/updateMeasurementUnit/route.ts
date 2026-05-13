import { defineRoute } from "@/routing/defineRoute.js";
import { updateMeasurementUnitHandler } from "./handler.js";
import {
  UpdateMeasurementUnitBody,
  UpdateMeasurementUnitBodySchema,
  UpdateMeasurementUnitParams,
  UpdateMeasurementUnitParamsSchema,
  UpdateMeasurementUnitResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMeasurementUnitRoute = defineRoute<{
  Params: UpdateMeasurementUnitParams;
  Body: UpdateMeasurementUnitBody;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["measurement-units"],
    summary: "Update a measurement unit",
    description:
      "Updates a measurement unit. Physical fields (magnitude, baseFactor, isBase) are locked once the unit is referenced.",
    params: UpdateMeasurementUnitParamsSchema,
    body: UpdateMeasurementUnitBodySchema,
    response: {
      200: UpdateMeasurementUnitResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateMeasurementUnitHandler,
});
