import { z } from "zod";
import type {
  UpdateCarbonInventorySubcategoriesRequestItemSchema,
  UpdateCarbonInventorySubcategoriesRequestSchema,
  UpdateCarbonInventorySubcategoriesResponseSchema,
} from "./schemas.js";

export type UpdateCarbonInventorySubcategoriesRequestItem = z.infer<
  typeof UpdateCarbonInventorySubcategoriesRequestItemSchema
>;

export type UpdateCarbonInventorySubcategoriesRequest = z.infer<
  typeof UpdateCarbonInventorySubcategoriesRequestSchema
>;

export type UpdateCarbonInventorySubcategoriesResponse = z.infer<
  typeof UpdateCarbonInventorySubcategoriesResponseSchema
>;
