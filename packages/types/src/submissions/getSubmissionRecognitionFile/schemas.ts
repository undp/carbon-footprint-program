import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetSubmissionRecognitionFileParamsSchema = z.object({
  id: IdSchema.describe("The submission ID"),
});

export const GetSubmissionRecognitionFileResponseSchema = z.object({
  previewUrl: z
    .url()
    .describe("Signed SAS URL for the recognition diploma file"),
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
});
