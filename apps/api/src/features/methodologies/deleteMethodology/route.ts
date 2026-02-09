import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteMethodologyHandler } from "./handler.js";
import {
  DeleteMethodologyParamsSchema,
  DeleteMethodologyResponseSchema,
} from "@repo/types";
import {
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const deleteMethodologyRoute = (fastify: FastifyZodInstance) => {
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
          404: NotFoundErrorResponseSchema,
          409: StructuredErrorResponseSchema,
        },
      },
    },
    deleteMethodologyHandler
  );
};
