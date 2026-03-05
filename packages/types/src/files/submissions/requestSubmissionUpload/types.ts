import { z } from "zod";
import type {
  RequestSubmissionUploadParamsSchema,
  RequestSubmissionUploadBodySchema,
  RequestSubmissionUploadResponseSchema,
} from "./schemas.js";

export type RequestSubmissionUploadParams = z.infer<
  typeof RequestSubmissionUploadParamsSchema
>;

export type RequestSubmissionUploadBody = z.infer<
  typeof RequestSubmissionUploadBodySchema
>;

export type RequestSubmissionUploadResponse = z.infer<
  typeof RequestSubmissionUploadResponseSchema
>;
