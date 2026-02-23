import { z } from "zod";
import type {
  SubmissionRequestUploadBodySchema,
  SubmissionRequestUploadResponseSchema,
  SubmissionConfirmUploadBodySchema,
  SubmissionConfirmUploadResponseSchema,
  SubmissionGetFilesQuerySchema,
  SubmissionGetFilesResponseSchema,
} from "./schemas.ts";

export type SubmissionRequestUploadBody = z.infer<
  typeof SubmissionRequestUploadBodySchema
>;
export type SubmissionRequestUploadResponse = z.infer<
  typeof SubmissionRequestUploadResponseSchema
>;
export type SubmissionConfirmUploadBody = z.infer<
  typeof SubmissionConfirmUploadBodySchema
>;
export type SubmissionConfirmUploadResponse = z.infer<
  typeof SubmissionConfirmUploadResponseSchema
>;
export type SubmissionGetFilesQuery = z.infer<
  typeof SubmissionGetFilesQuerySchema
>;
export type SubmissionGetFilesResponse = z.infer<
  typeof SubmissionGetFilesResponseSchema
>;
