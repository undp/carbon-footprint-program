import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryByIdHandler } from "./handler.js";
import { IdSchema, GetCarbonInventoryByIdResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getCarbonInventoryByIdRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get a carbon inventory by ID",
        description: "Get a single carbon inventory by its ID",
        params: ParamsSchema,
        response: {
          200: GetCarbonInventoryByIdResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getCarbonInventoryByIdHandler
  );
};
