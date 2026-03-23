import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllSubcategoriesService } from "./service.js";
import type {
  GetAllSubcategoriesResponse,
  GetAllSubcategoriesQuery,
} from "@repo/types";

export const getAllSubcategoriesHandler = createGetAllHandler<
  GetAllSubcategoriesResponse,
  GetAllSubcategoriesQuery
>(
  "subcategories",
  getAllSubcategoriesService,
  "Subcategories",
  false
);
