import { deleteReductionPlanInitiativeHandler } from "./handler.js";
import {
  DeleteReductionPlanInitiativeParams,
  DeleteReductionPlanInitiativeParamsSchema,
  DeleteReductionPlanInitiativeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const deleteReductionPlanInitiativeRoute = defineRoute<{
  Params: DeleteReductionPlanInitiativeParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["admin-reduction-plan-initiatives"],
    summary: "Soft-delete a reduction plan initiative",
    params: DeleteReductionPlanInitiativeParamsSchema,
    response: {
      200: DeleteReductionPlanInitiativeResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteReductionPlanInitiativeHandler,
});
