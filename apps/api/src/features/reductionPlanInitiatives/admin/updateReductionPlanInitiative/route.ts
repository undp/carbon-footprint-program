import { updateReductionPlanInitiativeHandler } from "./handler.js";
import {
  UpdateReductionPlanInitiativeParams,
  UpdateReductionPlanInitiativeParamsSchema,
  UpdateReductionPlanInitiativeRequest,
  UpdateReductionPlanInitiativeRequestSchema,
  UpdateReductionPlanInitiativeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const updateReductionPlanInitiativeRoute = defineRoute<{
  Params: UpdateReductionPlanInitiativeParams;
  Body: UpdateReductionPlanInitiativeRequest;
}>({
  method: "PATCH",
  path: "/:id",
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
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateReductionPlanInitiativeHandler,
});
