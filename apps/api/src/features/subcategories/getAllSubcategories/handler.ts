import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllSubcategoriesService } from "./service.js";
import type {
  GetAllSubcategoriesQuery,
  GetAllSubcategoriesResponse,
} from "@repo/types";

export const getAllSubcategoriesHandler = createGetAllHandler<
  GetAllSubcategoriesResponse,
  GetAllSubcategoriesQuery
>("subcategories", getAllSubcategoriesService, "Subcategory", false);
