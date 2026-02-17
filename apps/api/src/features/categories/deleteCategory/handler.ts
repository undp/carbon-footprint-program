import { deleteCategoryService } from "./service.js";
import type { DeleteCategoryParams } from "@repo/types";
import { createDeleteHandler } from "@/handlerFactory/createDeleteHandler.js";

export const deleteCategoryHandler = createDeleteHandler<DeleteCategoryParams>(
  "categories",
  deleteCategoryService,
  "Category"
);
