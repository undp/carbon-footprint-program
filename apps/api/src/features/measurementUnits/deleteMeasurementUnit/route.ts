import { defineRoute } from "@/routing/defineRoute.js";
import { deleteMeasurementUnitHandler } from "./handler.js";
import {
  DeleteMeasurementUnitParams,
  DeleteMeasurementUnitParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

export const deleteMeasurementUnitRoute = defineRoute<{
  Params: DeleteMeasurementUnitParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["measurement-units"],
    summary: "Soft-delete a measurement unit",
    description:
      "Soft-deletes a measurement unit and its canonical rate unit. System-protected rows (kg, base units) cannot be deleted.",
    params: DeleteMeasurementUnitParamsSchema,
    response: {
      200: z.null().describe("Successfully soft-deleted"),
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteMeasurementUnitHandler,
});
