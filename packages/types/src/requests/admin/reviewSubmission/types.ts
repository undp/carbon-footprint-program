import { z } from "zod";
import {
  ReviewSubmissionBodySchema,
  ReviewSubmissionParamsSchema,
  ReviewSubmissionResponseSchema,
} from "./schemas.js";

export type ReviewSubmissionParams = z.infer<
  typeof ReviewSubmissionParamsSchema
>;
export type ReviewSubmissionBody = z.infer<typeof ReviewSubmissionBodySchema>;
export type ReviewSubmissionResponse = z.infer<
  typeof ReviewSubmissionResponseSchema
>;
