import { z } from "zod";
import type { GetCarbonInventorySubcategoriesSummaryResponseSchema } from "./schemas.js";

export type GetCarbonInventorySubcategoriesSummaryResponse = z.infer<
  typeof GetCarbonInventorySubcategoriesSummaryResponseSchema
>;
