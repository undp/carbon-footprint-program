import { z } from "zod";
import type {
  UpdateCarbonInventorySubcategoriesRequestSchema,
  UpdateCarbonInventorySubcategoriesResponseSchema,
} from "./schemas.js";

export type UpdateCarbonInventorySubcategoriesRequest = z.infer<
  typeof UpdateCarbonInventorySubcategoriesRequestSchema
>;

export type UpdateCarbonInventorySubcategoriesResponse = z.infer<
  typeof UpdateCarbonInventorySubcategoriesResponseSchema
>;
