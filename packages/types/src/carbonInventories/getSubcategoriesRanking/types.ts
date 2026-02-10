import type { z } from "zod";
import { GetSubcategoriesRankingResponseSchema } from "./schemas.js";

export type GetSubcategoriesRankingResponse = z.infer<
  typeof GetSubcategoriesRankingResponseSchema
>;
