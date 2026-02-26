import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionFileTypeSchema } from "../../baseSchemas.js";

export const RequestSubmissionUploadParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const RequestSubmissionUploadBodySchema = z.object({
  originalName: z
    .string()
    .min(1)
    .max(255)
    .trim()
    .regex(/^[ -~]+$/, "File name must only contain printable ASCII characters")
    .refine(
      (name) => !/[/\\:]/.test(name),
      "File name must not contain path separators or colons"
    )
    .describe("The original file name"),
  submissionFileType: SubmissionFileTypeSchema.describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const RequestSubmissionUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z
    .httpUrl()
    .describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
