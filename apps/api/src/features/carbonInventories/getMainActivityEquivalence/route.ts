import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMainActivityEquivalenceHandler } from "./handler.js";
import {
  IdSchema,
  GetMainActivityEquivalenceResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getMainActivityEquivalenceRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/:id/main-activity-equivalence",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get main activity equivalence",
        description:
          "Retrieves the emission rate per main activity unit for a carbon inventory. Returns null if main activity data is not defined.",
        params: ParamsSchema,
        response: {
          200: GetMainActivityEquivalenceResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getMainActivityEquivalenceHandler
  );
};
