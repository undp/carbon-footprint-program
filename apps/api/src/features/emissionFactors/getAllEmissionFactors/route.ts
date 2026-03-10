import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllEmissionFactorsHandler } from "./handler.js";
import {
  GetAllEmissionFactorsQuerySchema,
  GetAllEmissionFactorsResponseSchema,
} from "@repo/types";

export const getAllEmissionFactorsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["emission-factors"],
        summary: "Get all emission factors for a methodology version",
        description:
          "Get all active emission factors for a given methodology version, ordered by subcategory",
        querystring: GetAllEmissionFactorsQuerySchema,
        response: {
          200: GetAllEmissionFactorsResponseSchema,
        },
      },
    },
    getAllEmissionFactorsHandler
  );
};
