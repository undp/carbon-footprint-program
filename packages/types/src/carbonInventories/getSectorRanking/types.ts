import type { z } from "zod";
import {
  GetSectorRankingParamsSchema,
  GetSectorRankingResponseSchema,
  RankingItemSchema,
  RankingSeveritySchema,
} from "./schemas.js";

export type GetSectorRankingParams = z.infer<
  typeof GetSectorRankingParamsSchema
>;

export type RankingSeverity = z.infer<typeof RankingSeveritySchema>;

export type RankingItem = z.infer<typeof RankingItemSchema>;

export type GetSectorRankingResponse = z.infer<
  typeof GetSectorRankingResponseSchema
>;
