import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllActiveCategoriesService } from "./service.js";
import type {
  GetAllCategoriesResponse,
  GetAllCategoriesQuery,
} from "@repo/types";

export const getAllCategoriesHandler = createGetAllHandler<
  GetAllCategoriesResponse,
  GetAllCategoriesQuery
>(
  "categories",
  getAllActiveCategoriesService,
  "Categories",
  false // Don't treat empty array as not found
);
