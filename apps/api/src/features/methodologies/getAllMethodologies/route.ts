import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMethodologiesHandler } from "./handler.js";
import { GetAllMethodologiesResponseSchema } from "@repo/types";

export const getAllMethodologiesRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Get all methodologies",
        description:
          "Get all active methodologies with country info and counts of related categories and carbon inventories, ordered by creation date (newest first)",
        response: {
          200: GetAllMethodologiesResponseSchema,
        },
      },
    },
    getAllMethodologiesHandler
  );
};
