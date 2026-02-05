import type { FastifyZodInstance } from "@/types/fastify.js";
import { toggleManualTotalEmissionsHandler } from "./handler.js";
import { IdSchema, ToggleManualTotalEmissionsRequestSchema } from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const ToggleManualTotalEmissionsParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
  subcategoryId: IdSchema.describe("The subcategory ID"),
});

export type ToggleManualTotalEmissionsParams = z.infer<
  typeof ToggleManualTotalEmissionsParamsSchema
>;

export const toggleManualTotalEmissionsRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/:id/subcategories/:subcategoryId/manual-total-emissions",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Toggle between detailed and manual total emissions mode",
        description:
          "Toggle between detailed line-by-line emissions and a single manual total emissions line for a subcategory. When activating manual mode, existing lines are marked as outdated. When deactivating, previous lines are restored.",
        params: ToggleManualTotalEmissionsParamsSchema,
        body: ToggleManualTotalEmissionsRequestSchema,
        response: {
          204: z.null().describe("Operation successful"),
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    toggleManualTotalEmissionsHandler
  );
};
