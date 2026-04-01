import { z } from "zod";
import {
  GetSubmissionHistoryResponseSchema,
  SubmissionHistoryEntrySchema,
} from "./schemas.js";

export type GetSubmissionHistoryResponse = z.infer<
  typeof GetSubmissionHistoryResponseSchema
>;
export type SubmissionHistoryEntry = z.infer<
  typeof SubmissionHistoryEntrySchema
>;
