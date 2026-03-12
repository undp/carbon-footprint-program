import { z } from "zod";
import type {
  GetCarbonInventorySubcategoriesSummaryParamsSchema,
  GetCarbonInventorySubcategoriesSummaryResponseSchema,
} from "./schemas.js";

export type GetCarbonInventorySubcategoriesSummaryParams = z.infer<
  typeof GetCarbonInventorySubcategoriesSummaryParamsSchema
>;

export type GetCarbonInventorySubcategoriesSummaryResponse = z.infer<
  typeof GetCarbonInventorySubcategoriesSummaryResponseSchema
>;
