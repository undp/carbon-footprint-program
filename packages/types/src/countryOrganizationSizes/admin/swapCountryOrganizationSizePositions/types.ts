import type { z } from "zod";
import type {
  SwapCountryOrganizationSizePositionsRequestSchema,
  SwapCountryOrganizationSizePositionsResponseSchema,
} from "./schemas.js";

export type SwapCountryOrganizationSizePositionsRequest = z.infer<
  typeof SwapCountryOrganizationSizePositionsRequestSchema
>;

export type SwapCountryOrganizationSizePositionsResponse = z.infer<
  typeof SwapCountryOrganizationSizePositionsResponseSchema
>;
