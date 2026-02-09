import { z } from "zod";
import {
  type GetCarbonInventoryResultsResponseSchema,
  RankingSeveritySchema,
} from "./schemas.js";

export type GetCarbonInventoryResultsResponse = z.infer<
  typeof GetCarbonInventoryResultsResponseSchema
>;

export type RankingSeverity = z.infer<typeof RankingSeveritySchema>;
