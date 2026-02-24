import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { FileSchema, SubmissionFileTypeSchema } from "../../baseSchemas.js";

export const ConfirmSubmissionUploadParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const ConfirmSubmissionUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: z.string().describe("The original file name"),
  submissionFileType: SubmissionFileTypeSchema.describe(
    "The submission file type (ATTACHMENT or RECOGNITION)"
  ),
});

export const ConfirmSubmissionUploadResponseSchema = FileSchema;
