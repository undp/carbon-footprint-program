import { requestVerificationHandler } from "./handler.js";
import {
  RequestVerificationParamsSchema,
  RequestVerificationBodySchema,
  RequestVerificationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const requestVerificationRoute: StandardRouteSignature = (fastify) => {
  fastify.post(
    "/:id/request-verification",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Request verification submission for a carbon inventory",
        description:
          "Creates a new submission of type VERIFICATION for the specified carbon inventory",
        params: RequestVerificationParamsSchema,
        body: RequestVerificationBodySchema,
        response: {
          200: RequestVerificationResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    requestVerificationHandler
  );
};
