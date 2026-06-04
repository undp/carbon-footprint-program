import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { LineFileOriginalNameSchema } from "../schemas.js";
import { HttpUploadMethodSchema } from "../../files/httpMethod.js";

export const RequestLineFileUploadParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestLineFileUploadBodySchema = z.object({
  originalName: LineFileOriginalNameSchema,
});

export const RequestLineFileUploadResponseSchema = z.object({
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
