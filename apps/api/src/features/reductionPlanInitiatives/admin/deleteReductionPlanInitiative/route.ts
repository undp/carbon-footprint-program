import { deleteReductionPlanInitiativeHandler } from "./handler.js";
import {
  DeleteReductionPlanInitiativeParamsSchema,
  DeleteReductionPlanInitiativeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const deleteReductionPlanInitiativeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteReductionPlanInitiativeHandler
  );
};
