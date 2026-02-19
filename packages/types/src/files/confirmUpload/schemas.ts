import { z } from "zod";
import { FileSchema, SubmissionFileTypeSchema } from "../baseSchemas.js";

export const ConfirmUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  submissionFileType: SubmissionFileTypeSchema.optional().describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const ConfirmUploadResponseSchema = FileSchema;
