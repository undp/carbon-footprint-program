import { requestCalculationHandler } from "./handler.js";
import {
  RequestCalculationParamsSchema,
  RequestCalculationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const requestCalculationRoute: StandardRouteSignature = (fastify) => {
  fastify.post(
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
    },
    requestCalculationHandler
  );
};
