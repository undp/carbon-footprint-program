import { z } from "zod";
import { RouteFileTypeSchema } from "../../baseSchemas/file.js";

export const ConfirmUploadBodySchema = z.object({
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
  fileType: RouteFileTypeSchema.describe("The type of file being uploaded"),
});

export const ConfirmUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The confirmed file UUID"),
});
