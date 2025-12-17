import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountrySectorsHandler } from "./getAllCountrySectorsHandler.js";
import { GetAllCountrySectorsResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCountrySectorsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["country-sectors"],
        summary: "Get all country sectors",
        description: "Retrieves all country sectors with their details",
        response: {
          200: GetAllCountrySectorsResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllCountrySectorsHandler
  );
};
