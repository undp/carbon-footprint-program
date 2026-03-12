import type { z } from "zod";
import type {
  GetEmissionsDetailedSummaryParamsSchema,
  GetEmissionsDetailedSummaryResponseSchema,
} from "./schemas.js";

export type GetEmissionsDetailedSummaryParams = z.infer<
  typeof GetEmissionsDetailedSummaryParamsSchema
>;

export type GetEmissionsDetailedSummaryResponse = z.infer<
  typeof GetEmissionsDetailedSummaryResponseSchema
>;
