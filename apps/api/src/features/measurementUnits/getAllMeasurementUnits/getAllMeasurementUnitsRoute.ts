import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMeasurementUnitsHandler } from "./getAllMeasurementUnitsHandler.js";
import { GetAllMeasurementUnitsResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

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
