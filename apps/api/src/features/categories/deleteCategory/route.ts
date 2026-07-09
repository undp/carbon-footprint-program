import { defineRoute } from "@/routing/defineRoute.js";
import { deleteCategoryHandler } from "./handler.js";
import {
  DeleteCategoryParams,
  DeleteCategoryParamsSchema,
  DeleteCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteCategoryRoute = defineRoute<{
  Params: DeleteCategoryParams;
}>({
  method: "DELETE",
  path: "/:id",
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
  access: { mode: "private" },
  handler: deleteCategoryHandler,
});
