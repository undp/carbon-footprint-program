import type { z } from "zod";
import type {
  GetSectorRankingResponseSchema,
  RankingSeveritySchema,
} from "./schemas.js";

export type RankingSeverity = z.infer<typeof RankingSeveritySchema>;

export type GetSectorRankingResponse = z.infer<
  typeof GetSectorRankingResponseSchema
>;
