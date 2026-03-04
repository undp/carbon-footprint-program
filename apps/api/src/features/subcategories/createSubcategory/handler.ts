import { createPostHandler } from "@/handlerFactory/index.js";

import { createSubcategoryService } from "./service.js";

import type {
  CreateSubcategoryRequest,
  CreateSubcategoryResponse,
} from "@repo/types";

export const createSubcategoryHandler = createPostHandler<
  CreateSubcategoryRequest,
  CreateSubcategoryResponse
>("subcategories", createSubcategoryService, "Subcategory");
