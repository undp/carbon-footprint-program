import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionFileTypeSchema } from "../../baseSchemas.js";

export const RequestSubmissionUploadParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const RequestSubmissionUploadBodySchema = z.object({
  originalName: z.string().describe("The original file name"),
  submissionFileType: SubmissionFileTypeSchema.describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const RequestSubmissionUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
