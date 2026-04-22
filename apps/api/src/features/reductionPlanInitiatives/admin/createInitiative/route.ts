import { createInitiativeHandler } from "./handler.js";
import {
  CreateInitiativeRequestSchema,
  CreateInitiativeResponseSchema,
  type CreateInitiativeRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const createInitiativeRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.post<{ Body: CreateInitiativeRequest }>(
    "/",
    {
      schema: {
        tags: ["admin-reduction-plan-initiatives"],
        summary: "Create a reduction plan initiative",
        body: CreateInitiativeRequestSchema,
        response: {
          201: CreateInitiativeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    createInitiativeHandler
  );
};
