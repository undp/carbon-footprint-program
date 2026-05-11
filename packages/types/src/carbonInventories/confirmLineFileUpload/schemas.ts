import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const ConfirmLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const ConfirmLineFileUploadBodySchema = z.object({
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
});

export const ConfirmLineFileUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The confirmed file UUID"),
});
