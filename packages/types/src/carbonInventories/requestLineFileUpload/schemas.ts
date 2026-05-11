import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const RequestLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestLineFileUploadBodySchema = z.object({
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

export const RequestLineFileUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z
    .httpUrl()
    .describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
