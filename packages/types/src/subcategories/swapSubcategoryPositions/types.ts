import { z } from "zod";
import type {
  SwapSubcategoryPositionsRequestSchema,
  SwapSubcategoryPositionsResponseSchema,
} from "./schemas.js";

export type SwapSubcategoryPositionsRequest = z.infer<
  typeof SwapSubcategoryPositionsRequestSchema
>;
export type SwapSubcategoryPositionsResponse = z.infer<
  typeof SwapSubcategoryPositionsResponseSchema
>;
