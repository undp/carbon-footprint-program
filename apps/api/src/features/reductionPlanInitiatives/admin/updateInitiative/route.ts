import { updateInitiativeHandler } from "./handler.js";
import {
  UpdateInitiativeParamsSchema,
  UpdateInitiativeRequestSchema,
  UpdateInitiativeResponseSchema,
  type UpdateInitiativeParams,
  type UpdateInitiativeRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const updateInitiativeRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.patch<{
    Params: UpdateInitiativeParams;
    Body: UpdateInitiativeRequest;
  }>(
    "/:id",
    {
      schema: {
        tags: ["admin-reduction-plan-initiatives"],
        summary: "Update a reduction plan initiative",
        params: UpdateInitiativeParamsSchema,
        body: UpdateInitiativeRequestSchema,
        response: {
          200: UpdateInitiativeResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    updateInitiativeHandler
  );
};
