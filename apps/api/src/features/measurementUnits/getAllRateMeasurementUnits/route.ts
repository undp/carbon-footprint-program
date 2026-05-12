import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllRateMeasurementUnitsHandler } from "./handler.js";
import { GetAllRateMeasurementUnitsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllRateMeasurementUnitsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/rates",
    {
      schema: {
        tags: ["measurement-units"],
        summary: "Get all rate measurement units",
        description:
          "Retrieves all ACTIVE rate measurement units with their numerator and denominator units. Each item includes a per-category reference count breakdown and a derived total. The full list is returned in a single response; consumers that need filtering apply it client-side.",
        response: {
          200: GetAllRateMeasurementUnitsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllRateMeasurementUnitsHandler
  );
};
