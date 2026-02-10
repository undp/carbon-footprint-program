import type { FastifyZodInstance } from "@/types/fastify.js";
import { getEmissionFactorsHandler } from "./handler.js";
import { IdSchema, GetEmissionFactorsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getEmissionFactorsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id/emission-factors",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get emission factors used in inventory",
        description:
          "Retrieves all emission factors used in the inventory, including category/subcategory info, activity parameters, gas breakdown, and factor sources.",
        params: ParamsSchema,
        response: {
          200: GetEmissionFactorsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getEmissionFactorsHandler
  );
};
