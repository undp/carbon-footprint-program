import { z } from "zod";
import { FileSchema, SubmissionFileTypeSchema } from "../baseSchemas.js";

export const UploadFileQuerySchema = z.object({
  submissionFileType: SubmissionFileTypeSchema.optional().describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const UploadFileResponseSchema = FileSchema;
