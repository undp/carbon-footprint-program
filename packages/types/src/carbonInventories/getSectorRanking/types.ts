import type { z } from "zod";
import {
  GetSectorRankingResponseSchema,
  RankingItemSchema,
  RankingSeveritySchema,
} from "./schemas.js";

export type RankingSeverity = z.infer<typeof RankingSeveritySchema>;

export type RankingItem = z.infer<typeof RankingItemSchema>;

export type GetSectorRankingResponse = z.infer<
  typeof GetSectorRankingResponseSchema
>;
