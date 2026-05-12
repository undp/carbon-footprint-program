import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllMeasurementUnitsHandler } from "./handler.js";
import { GetAllMeasurementUnitsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllMeasurementUnitsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["measurement-units"],
        summary: "Get all measurement units",
        description: "Retrieves all measurement units with their details",
        response: {
          200: GetAllMeasurementUnitsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllMeasurementUnitsHandler
  );
};
