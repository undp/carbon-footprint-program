import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllRateMeasurementUnitsHandler } from "./handler.js";
import { GetAllRateMeasurementUnitsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllRateMeasurementUnitsRoute = (
  fastify: FastifyZodInstance
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
    },
    getAllRateMeasurementUnitsHandler
  );
};
