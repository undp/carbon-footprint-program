import { toggleManualTotalEmissionsHandler } from "./handler.js";
import {
  ToggleManualTotalEmissionsRequestSchema,
  ToggleManualTotalEmissionsParamsSchema,
  type ToggleManualTotalEmissionsRequest,
  type ToggleManualTotalEmissionsParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";
import type { FastifyRequest } from "fastify";

const extractCarbonInventoryId = async (request: FastifyRequest) =>
  Promise.resolve((request.params as ToggleManualTotalEmissionsParams).id);

export const toggleManualTotalEmissionsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: ToggleManualTotalEmissionsParams;
    Body: ToggleManualTotalEmissionsRequest;
  }>(
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
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [fastify.requireEditableInventory(extractCarbonInventoryId)],
      config: {
        public: options?.public ?? false,
      },
    },
    toggleManualTotalEmissionsHandler
  );
};
