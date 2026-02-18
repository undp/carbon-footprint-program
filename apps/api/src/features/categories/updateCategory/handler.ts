import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateCategoryService } from "./service.js";
import type {
  UpdateCategoryParams,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
} from "@repo/types";

export const updateCategoryHandler = createPatchHandler<
  UpdateCategoryParams,
  UpdateCategoryRequest,
  UpdateCategoryResponse
>("categories", updateCategoryService, "Category");
