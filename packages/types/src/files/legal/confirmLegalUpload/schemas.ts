import { z } from "zod";

export const ConfirmLegalUploadBodySchema = z.object({
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

export const ConfirmLegalUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The persisted file UUID"),
});
