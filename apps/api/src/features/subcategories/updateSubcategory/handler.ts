import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateSubcategoryService } from "./service.js";
import type {
  UpdateSubcategoryParams,
  UpdateSubcategoryRequest,
  UpdateSubcategoryResponse,
} from "@repo/types";

export const updateSubcategoryHandler = createPatchHandler<
  UpdateSubcategoryParams,
  UpdateSubcategoryRequest,
  UpdateSubcategoryResponse
>("subcategories", updateSubcategoryService, "Subcategory");
