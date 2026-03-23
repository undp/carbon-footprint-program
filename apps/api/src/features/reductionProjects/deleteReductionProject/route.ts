import { deleteReductionProjectHandler } from "./handler.js";
import { DeleteReductionProjectParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const deleteReductionProjectRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Delete a reduction project",
        description: "Deletes a DRAFT or OBJECTED reduction project",
        params: DeleteReductionProjectParamsSchema,
        response: {
          200: {},
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    deleteReductionProjectHandler
  );
};
