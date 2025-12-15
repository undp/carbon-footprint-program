import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllJobPositionsHandler } from "./getAllJobPositionsHandler.js";
import { GetAllJobPositionsResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllJobPositionsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["job-positions"],
        summary: "Get all job positions",
        description: "Get all job positions",
        response: {
          200: GetAllJobPositionsResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllJobPositionsHandler
  );
};
