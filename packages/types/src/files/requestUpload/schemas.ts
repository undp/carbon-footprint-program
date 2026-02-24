import { z } from "zod";
import { SubmissionFileTypeSchema } from "../baseSchemas.js";

export const RequestUploadBodySchema = z.object({
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  submissionFileType: SubmissionFileTypeSchema.optional().describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const RequestUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z
    .string()
    .url()
    .describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
