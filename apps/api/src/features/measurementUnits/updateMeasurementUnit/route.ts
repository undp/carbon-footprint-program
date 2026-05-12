import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateMeasurementUnitHandler } from "./handler.js";
import {
  UpdateMeasurementUnitParamsSchema,
  UpdateMeasurementUnitBodySchema,
  UpdateMeasurementUnitResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMeasurementUnitRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateMeasurementUnitHandler
  );
};
