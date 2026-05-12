import { createReductionPlanInitiativeHandler } from "./handler.js";
import {
  CreateReductionPlanInitiativeRequestSchema,
  CreateReductionPlanInitiativeResponseSchema,
  type CreateReductionPlanInitiativeRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const createReductionPlanInitiativeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{ Body: CreateReductionPlanInitiativeRequest }>(
    "/",
    {
      schema: {
        tags: ["admin-reduction-plan-initiatives"],
        summary: "Create a reduction plan initiative",
        body: CreateReductionPlanInitiativeRequestSchema,
        response: {
          201: CreateReductionPlanInitiativeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createReductionPlanInitiativeHandler
  );
};
