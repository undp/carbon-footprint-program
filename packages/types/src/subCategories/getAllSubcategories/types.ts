import { z } from "zod";
import type {
  GetAllSubcategoriesQuerySchema,
  GetAllSubcategoriesResponseSchema,
} from "./schemas.js";

export type GetAllSubcategoriesQuery = z.infer<
  typeof GetAllSubcategoriesQuerySchema
>;
export type GetAllSubcategoriesResponse = z.infer<
  typeof GetAllSubcategoriesResponseSchema
>;
