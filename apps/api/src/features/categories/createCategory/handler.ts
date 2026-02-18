import { createPostHandler } from "@/handlerFactory/index.js";
import { createCategoryService } from "./service.js";
import type {
  CreateCategoryRequest,
  CreateCategoryResponse,
} from "@repo/types";

export const createCategoryHandler = createPostHandler<
  CreateCategoryRequest,
  CreateCategoryResponse
>("categories", createCategoryService, "Category");
