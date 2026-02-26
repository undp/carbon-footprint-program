import { z } from "zod";
import type {
  SwapCategoryPositionsRequestSchema,
  SwapCategoryPositionsResponseSchema,
} from "./schemas.js";

export type SwapCategoryPositionsRequest = z.infer<
  typeof SwapCategoryPositionsRequestSchema
>;
export type SwapCategoryPositionsResponse = z.infer<
  typeof SwapCategoryPositionsResponseSchema
>;
