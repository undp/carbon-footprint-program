import { getEmissionFactorsHandler } from "./handler.js";
import { IdSchema, GetEmissionFactorsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getEmissionFactorsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
      config: {
        public: options?.public ?? false,
      },
    },
    getEmissionFactorsHandler
  );
};
