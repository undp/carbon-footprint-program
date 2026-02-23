import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCategoriesHandler } from "./handler.js";
import {
  GetAllCategoriesQuerySchema,
  GetAllCategoriesResponseSchema,
} from "@repo/types";

export const getAllCategoriesRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["categories"],
        summary: "Get all categories for a methodology version",
        description:
          "Get all active categories for a given methodology version, ordered by position ascending",
        querystring: GetAllCategoriesQuerySchema,
        response: {
          200: GetAllCategoriesResponseSchema,
        },
      },
    },
    getAllCategoriesHandler
  );
};
