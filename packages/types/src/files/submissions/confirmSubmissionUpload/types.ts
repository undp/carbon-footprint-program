import { z } from "zod";
import type {
  ConfirmSubmissionUploadParamsSchema,
  ConfirmSubmissionUploadBodySchema,
  ConfirmSubmissionUploadResponseSchema,
} from "./schemas.js";

export type ConfirmSubmissionUploadParams = z.infer<
  typeof ConfirmSubmissionUploadParamsSchema
>;

export type ConfirmSubmissionUploadBody = z.infer<
  typeof ConfirmSubmissionUploadBodySchema
>;

export type ConfirmSubmissionUploadResponse = z.infer<
  typeof ConfirmSubmissionUploadResponseSchema
>;
