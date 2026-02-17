import { z } from "zod";
import type {
  EmissionFactorSchema,
  EmissionFactorDimensionSchema,
  DimensionValueSchema,
  SubcategorySchema,
  GetCarbonInventoryMethodologyResponseSchema,
  InventoryCategorySchema,
} from "./schemas.js";

export type EmissionFactor = z.infer<typeof EmissionFactorSchema>;

export type EmissionFactorDimension = z.infer<
  typeof EmissionFactorDimensionSchema
>;

export type DimensionValue = z.infer<typeof DimensionValueSchema>;

export type InventoryCategory = z.infer<typeof InventoryCategorySchema>;

export type Subcategory = z.infer<typeof SubcategorySchema>;

export type GetCarbonInventoryMethodologyResponse = z.infer<
  typeof GetCarbonInventoryMethodologyResponseSchema
>;
