import type { z } from "zod";
import type { GetEmissionsDetailedSummaryResponseSchema } from "./schemas.js";

export type GetEmissionsDetailedSummaryResponse = z.infer<
  typeof GetEmissionsDetailedSummaryResponseSchema
>;
