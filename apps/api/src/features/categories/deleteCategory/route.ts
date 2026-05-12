import { StandardRouteSignature } from "@/routes/api/index.js";
import { deleteCategoryHandler } from "./handler.js";
import {
  DeleteCategoryParamsSchema,
  DeleteCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteCategoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["categories"],
        summary: "Delete a category",
        description: "Soft delete a category by setting its status to DELETED",
        params: DeleteCategoryParamsSchema,
        response: {
          200: DeleteCategoryResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteCategoryHandler
  );
};
