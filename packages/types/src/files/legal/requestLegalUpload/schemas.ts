import { z } from "zod";

export const RequestLegalUploadBodySchema = z.object({
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

export const RequestLegalUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
