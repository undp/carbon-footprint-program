import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCurrentMethodologyHandler } from "./getCurrentMethodologyHandler.js";
import { GetCurrentMethodologyResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getCurrentMethodologyRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["methodology"],
        summary: "Get current methodology",
        description:
          "Retrieves the first methodology found with all its categories, subcategories, dimensions, and dimension values. Emission factors are excluded.",
        response: {
          200: GetCurrentMethodologyResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getCurrentMethodologyHandler
  );
};
