import { z } from "zod";
import type {
  AddSubcategoriesToCarbonInventoryBodySchema,
  AddSubcategoriesToCarbonInventoryParamsSchema,
  AddSubcategoriesToCarbonInventoryResponseSchema,
} from "./schemas.js";

export type AddSubcategoriesToCarbonInventoryBody = z.infer<
  typeof AddSubcategoriesToCarbonInventoryBodySchema
>;

export type AddSubcategoriesToCarbonInventoryResponse = z.infer<
  typeof AddSubcategoriesToCarbonInventoryResponseSchema
>;

export type AddSubcategoriesToCarbonInventoryParams = z.infer<
  typeof AddSubcategoriesToCarbonInventoryParamsSchema
>;
