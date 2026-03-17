import type { z } from "zod";
import type {
  GetSubcategoriesRankingParamsSchema,
  GetSubcategoriesRankingResponseSchema,
} from "./schemas.js";

export type GetSubcategoriesRankingParams = z.infer<
  typeof GetSubcategoriesRankingParamsSchema
>;

export type GetSubcategoriesRankingResponse = z.infer<
  typeof GetSubcategoriesRankingResponseSchema
>;
