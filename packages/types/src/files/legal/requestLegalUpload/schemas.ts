import { z } from "zod";
import { LegalOriginalNameSchema } from "../baseSchemas.js";
import { HttpUploadMethodSchema } from "../../httpMethod.js";

export const RequestLegalUploadBodySchema = z.object({
  originalName: LegalOriginalNameSchema.describe("The original file name"),
});

export const RequestLegalUploadResponseSchema = z.object({
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
