import { z } from "zod";
import type {
  AddSubcategoriesToCarbonInventoryBodySchema,
  AddSubcategoriesToCarbonInventoryResponseSchema,
} from "./schemas.js";

export type AddSubcategoriesToCarbonInventoryBody = z.infer<
  typeof AddSubcategoriesToCarbonInventoryBodySchema
>;

export type AddSubcategoriesToCarbonInventoryResponse = z.infer<
  typeof AddSubcategoriesToCarbonInventoryResponseSchema
>;
