import type { z } from "zod";
import type { GetSubcategoriesRankingResponseSchema } from "./schemas.js";

export type GetSubcategoriesRankingResponse = z.infer<
  typeof GetSubcategoriesRankingResponseSchema
>;
