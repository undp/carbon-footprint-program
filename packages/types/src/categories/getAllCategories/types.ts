import { z } from "zod";
import type {
  GetAllCategoriesQuerySchema,
  GetAllCategoriesResponseSchema,
} from "./schemas.js";

export type GetAllCategoriesQuery = z.infer<typeof GetAllCategoriesQuerySchema>;
export type GetAllCategoriesResponse = z.infer<
  typeof GetAllCategoriesResponseSchema
>;
