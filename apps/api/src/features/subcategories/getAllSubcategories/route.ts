import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllSubcategoriesHandler } from "./handler.js";
import {
  GetAllSubcategoriesQuerySchema,
  GetAllSubcategoriesResponseSchema,
} from "@repo/types";

export const getAllSubcategoriesRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["subcategories"],
        summary: "Get all subcategories for a methodology version",
        description:
          "Get all active subcategories for a given methodology version, ordered by name ascending",
        querystring: GetAllSubcategoriesQuerySchema,
        response: {
          200: GetAllSubcategoriesResponseSchema,
        },
      },
    },
    getAllSubcategoriesHandler
  );
};
