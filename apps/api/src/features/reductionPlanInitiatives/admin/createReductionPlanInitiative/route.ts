import { createReductionPlanInitiativeHandler } from "./handler.js";
import {
  CreateReductionPlanInitiativeRequest,
  CreateReductionPlanInitiativeRequestSchema,
  CreateReductionPlanInitiativeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const createReductionPlanInitiativeRoute = defineRoute<{
  Body: CreateReductionPlanInitiativeRequest;
}>({
  method: "POST",
  path: "/",
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
  access: { mode: "private" },
  handler: createReductionPlanInitiativeHandler,
});
