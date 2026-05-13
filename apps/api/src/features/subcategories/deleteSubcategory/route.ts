import { defineRoute } from "@/routing/defineRoute.js";
import { deleteSubcategoryHandler } from "./handler.js";
import {
  DeleteSubcategoryParams,
  DeleteSubcategoryParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteSubcategoryRoute = defineRoute<{
  Params: DeleteSubcategoryParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["subcategories"],
    summary: "Delete a subcategory",
    description: "Soft-delete a subcategory by its ID",
    params: DeleteSubcategoryParamsSchema,
    response: {
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteSubcategoryHandler,
});
