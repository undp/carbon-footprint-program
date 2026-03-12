import { requestCalculationHandler } from "./handler.js";
import {
  RequestCalculationParamsSchema,
  RequestCalculationResponseSchema,
  type RequestCalculationParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const requestCalculationRoute: StandardRouteSignature = (fastify) => {
  fastify.post<{ Params: RequestCalculationParams }>(
    "/:id/request-calculation",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Request calculation submission for a carbon inventory",
        description:
          "Creates a new submission of type CALCULATION for the specified carbon inventory",
        params: RequestCalculationParamsSchema,
        response: {
          200: RequestCalculationResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    requestCalculationHandler
  );
};
