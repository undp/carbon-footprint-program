import { z } from "zod";
import { RouteFileTypeSchema } from "../../baseSchemas/file.js";
import { FilenameSchema } from "../../baseSchemas/filename.js";

export const RequestUploadBodySchema = z.object({
  originalName: FilenameSchema.describe("The original file name"),
  fileType: RouteFileTypeSchema.describe("The type of file being uploaded"),
});

export const RequestUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z
    .httpUrl()
    .describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
