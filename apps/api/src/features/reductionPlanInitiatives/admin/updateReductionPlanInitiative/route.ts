import { updateReductionPlanInitiativeHandler } from "./handler.js";
import {
  UpdateReductionPlanInitiativeParamsSchema,
  UpdateReductionPlanInitiativeRequestSchema,
  UpdateReductionPlanInitiativeResponseSchema,
  type UpdateReductionPlanInitiativeParams,
  type UpdateReductionPlanInitiativeRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const updateReductionPlanInitiativeRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.patch<{
    Params: UpdateReductionPlanInitiativeParams;
    Body: UpdateReductionPlanInitiativeRequest;
  }>(
    "/:id",
    {
      schema: {
        tags: ["admin-reduction-plan-initiatives"],
        summary: "Update a reduction plan initiative",
        params: UpdateReductionPlanInitiativeParamsSchema,
        body: UpdateReductionPlanInitiativeRequestSchema,
        response: {
          200: UpdateReductionPlanInitiativeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    updateReductionPlanInitiativeHandler
  );
};
