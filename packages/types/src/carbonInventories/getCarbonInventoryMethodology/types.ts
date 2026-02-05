import { z } from "zod";
import type {
  EmissionFactorSchema,
  EmissionFactorDimensionSchema,
  DimensionValueSchema,
  CategorySchema,
  SubcategorySchema,
  GetCarbonInventoryMethodologyResponseSchema,
} from "./schemas.js";

export type EmissionFactor = z.infer<typeof EmissionFactorSchema>;

export type EmissionFactorDimension = z.infer<
  typeof EmissionFactorDimensionSchema
>;

export type DimensionValue = z.infer<typeof DimensionValueSchema>;

export type Category = z.infer<typeof CategorySchema>;

export type Subcategory = z.infer<typeof SubcategorySchema>;

export type GetCarbonInventoryMethodologyResponse = z.infer<
  typeof GetCarbonInventoryMethodologyResponseSchema
>;
