import { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteMeasurementUnitHandler } from "./handler.js";
import { DeleteMeasurementUnitParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteMeasurementUnitRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteMeasurementUnitHandler
  );
};
