import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllRateMeasurementUnitsHandler } from "./getAllRateMeasurementUnitsHandler.js";
import { GetAllRateMeasurementUnitsResponseSchema } from "./getAllRateMeasurementUnitsSchema.js";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

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
          "Retrieves all rate measurement units with their numerator and denominator units",
        response: {
          200: GetAllRateMeasurementUnitsResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllRateMeasurementUnitsHandler
  );
};
