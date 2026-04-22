import { deleteInitiativeHandler } from "./handler.js";
import {
  DeleteInitiativeParamsSchema,
  DeleteInitiativeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const deleteInitiativeRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-reduction-plan-initiatives"],
        summary: "Soft-delete a reduction plan initiative",
        params: DeleteInitiativeParamsSchema,
        response: {
          200: DeleteInitiativeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteInitiativeHandler
  );
};
