import { z } from "zod";
import { RouteFileTypeSchema } from "../../baseSchemas/file.js";
import { HttpUploadMethodSchema } from "../httpMethod.js";

export const RequestUploadBodySchema = z.object({
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

export const RequestUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  uploadMethod: HttpUploadMethodSchema.describe(
    "HTTP method the client must use to upload the file"
  ),
  uploadHeaders: z
    .record(z.string(), z.string())
    .describe("HTTP headers the client must send when uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
