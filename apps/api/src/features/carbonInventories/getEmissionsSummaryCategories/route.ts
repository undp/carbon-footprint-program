import type { FastifyZodInstance } from "@/types/fastify.js";
import { getEmissionsSummaryCategoriesHandler } from "./handler.js";
import {
  IdSchema,
  GetEmissionsSummaryCategoriesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getEmissionsSummaryCategoriesRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/:id/emissions-summary/categories",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get emissions summary by category",
        description:
          "Retrieves emissions totals and percentages grouped by category and subcategory for a carbon inventory.",
        params: ParamsSchema,
        response: {
          200: GetEmissionsSummaryCategoriesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getEmissionsSummaryCategoriesHandler
  );
};
