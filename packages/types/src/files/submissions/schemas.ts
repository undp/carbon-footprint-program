import { z } from "zod";
import {
  FileSchema,
  FileStatusSchema,
  SubmissionFileTypeSchema,
} from "../baseSchemas.js";

export const SubmissionRequestUploadBodySchema = z.object({
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  submissionFileType: SubmissionFileTypeSchema.describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const SubmissionRequestUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});

export const SubmissionConfirmUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: z.string().describe("The original file name"),
  submissionFileType: SubmissionFileTypeSchema.describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const SubmissionConfirmUploadResponseSchema = FileSchema;

export const SubmissionGetFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
  submissionFileType: SubmissionFileTypeSchema.optional().describe(
    "Filter by submission file type"
  ),
});

export const SubmissionGetFilesResponseSchema = z.array(FileSchema);
