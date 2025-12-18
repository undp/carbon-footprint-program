import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCarbonInventoriesHandler } from "./getAllCarbonInventoriesHandler.js";
import { GetAllCarbonInventoriesResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCarbonInventoriesRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get all carbon inventories",
        description:
          "Get all carbon inventories ordered by creation date (newest first)",
        response: {
          200: GetAllCarbonInventoriesResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllCarbonInventoriesHandler
  );
};
