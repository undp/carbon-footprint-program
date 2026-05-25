import { z } from "zod";
import { FilenameSchema } from "../../../baseSchemas/filename.js";

export const RequestLegalUploadBodySchema = z.object({
  originalName: FilenameSchema.describe("The original file name"),
});

export const RequestLegalUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
