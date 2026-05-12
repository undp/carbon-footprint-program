import { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteMethodologyHandler } from "./handler.js";
import {
  DeleteMethodologyParamsSchema,
  DeleteMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteMethodologyRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Delete a methodology",
        description:
          "Soft delete a methodology by setting its status to DELETED",
        params: DeleteMethodologyParamsSchema,
        response: {
          200: DeleteMethodologyResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteMethodologyHandler
  );
};
