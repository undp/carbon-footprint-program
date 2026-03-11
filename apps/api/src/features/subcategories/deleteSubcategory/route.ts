import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteSubcategoryHandler } from "./handler.js";
import { DeleteSubcategoryParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteSubcategoryRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["subcategories"],
        summary: "Delete a subcategory",
        description: "Soft-delete a subcategory by its ID",
        params: DeleteSubcategoryParamsSchema,
        response: {
          200: null,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteSubcategoryHandler
  );
};
