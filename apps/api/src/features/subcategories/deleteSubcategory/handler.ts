import { createDeleteHandler } from "@/handlerFactory/createDeleteHandler.js";
import { deleteSubcategoryService } from "./service.js";
import type { DeleteSubcategoryParams } from "@repo/types";

export const deleteSubcategoryHandler = createDeleteHandler<
  DeleteSubcategoryParams
>("subcategories", deleteSubcategoryService, "Subcategory");
