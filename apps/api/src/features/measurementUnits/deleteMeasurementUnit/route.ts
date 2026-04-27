import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteMeasurementUnitHandler } from "./handler.js";
import {
  DeleteMeasurementUnitParamsSchema,
  DeleteMeasurementUnitResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteMeasurementUnitRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["measurement-units"],
        summary: "Soft-delete a measurement unit",
        description:
          "Soft-deletes a measurement unit and its canonical rate unit. System-protected rows (kg, base units) cannot be deleted.",
        params: DeleteMeasurementUnitParamsSchema,
        response: {
          200: DeleteMeasurementUnitResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    deleteMeasurementUnitHandler
  );
};
