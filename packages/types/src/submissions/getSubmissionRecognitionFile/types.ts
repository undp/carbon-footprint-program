import { z } from "zod";
import {
  GetSubmissionRecognitionFileParamsSchema,
  GetSubmissionRecognitionFileResponseSchema,
} from "./schemas.js";

export type GetSubmissionRecognitionFileParams = z.infer<
  typeof GetSubmissionRecognitionFileParamsSchema
>;

export type GetSubmissionRecognitionFileResponse = z.infer<
  typeof GetSubmissionRecognitionFileResponseSchema
>;
