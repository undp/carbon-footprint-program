import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMeasurementUnitsHandler } from "./getAllMeasurementUnitsHandler.js";
import { GetAllMeasurementUnitsResponseSchema } from "./getAllMeasurementUnitsSchema.js";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Get All Measurement Units feature.
// EXPLANATION:
// This file connects the URL path to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

export const getAllMeasurementUnitsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["measurement-units"],
        summary: "Get all measurement units",
        description: "Retrieves all measurement units with their details",
        response: {
          200: GetAllMeasurementUnitsResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllMeasurementUnitsHandler
  );
};
