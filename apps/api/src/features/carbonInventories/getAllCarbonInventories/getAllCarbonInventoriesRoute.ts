import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCarbonInventoriesHandler } from "./getAllCarbonInventoriesHandler.js";
import {
  GetAllCarbonInventoriesQuerySchema,
  GetAllCarbonInventoriesResponseSchema,
} from "@repo/types";

export const getAllCarbonInventoriesRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get all carbon inventories",
        description:
          'Get all carbon inventories ordered by creation date (newest first). Optional parameter: year (e.g., ?year=2024)',
        querystring: GetAllCarbonInventoriesQuerySchema,
        response: {
          200: GetAllCarbonInventoriesResponseSchema,
        },
      },
    },
    getAllCarbonInventoriesHandler
  );
};
