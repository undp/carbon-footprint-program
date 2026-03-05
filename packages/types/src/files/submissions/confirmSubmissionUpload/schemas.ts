import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionFileTypeSchema } from "../../schemas.js";
import { FileBaseSchema } from "../../../baseSchemas/index.js";

export const ConfirmSubmissionUploadParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const ConfirmSubmissionUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
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

export const ConfirmSubmissionUploadResponseSchema = FileBaseSchema;
