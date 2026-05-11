import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { LineFileSummarySchema } from "../schemas.js";

export const ConfirmLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const ConfirmLineFileUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[ -~]+$/, "File name must only contain printable ASCII characters")
    .refine(
      (name) => !/[/\\:]/.test(name),
      "File name must not contain path separators or colons"
    )
    .describe("The original file name"),
});

export const ConfirmLineFileUploadResponseSchema = LineFileSummarySchema;
