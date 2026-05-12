import { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteSubcategoryHandler } from "./handler.js";
import { DeleteSubcategoryParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteSubcategoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["subcategories"],
        summary: "Delete a subcategory",
        description: "Soft-delete a subcategory by its ID",
        params: DeleteSubcategoryParamsSchema,
        response: {
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteSubcategoryHandler
  );
};
