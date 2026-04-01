import { z } from "zod";
import {
  GetSubmissionHistoryQuerySchema,
  GetSubmissionHistoryResponseSchema,
  SubmissionHistoryEntrySchema,
} from "./schemas.js";

export type GetSubmissionHistoryQuery = z.infer<
  typeof GetSubmissionHistoryQuerySchema
>;
export type GetSubmissionHistoryResponse = z.infer<
  typeof GetSubmissionHistoryResponseSchema
>;
export type SubmissionHistoryEntry = z.infer<
  typeof SubmissionHistoryEntrySchema
>;
