import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllRateMeasurementUnitsHandler } from "./getAllRateMeasurementUnitsHandler.js";
import {
  GetAllRateMeasurementUnitsResponseSchema,
  GetAllRateMeasurementUnitsNotFoundErrorSchema,
} from "./getAllRateMeasurementUnitsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Get All Rate Measurement Units feature.
// EXPLANATION:
// This file connects the URL path to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

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
          404: GetAllRateMeasurementUnitsNotFoundErrorSchema,
        },
      },
    },
    getAllRateMeasurementUnitsHandler
  );
};
