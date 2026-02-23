import { z } from "zod";
import { FileSchema, FileStatusSchema } from "../baseSchemas.js";

export const BadgeRequestUploadBodySchema = z.object({
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
});

export const BadgeRequestUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});

export const BadgeConfirmUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: z.string().describe("The original file name"),
});

export const BadgeConfirmUploadResponseSchema = FileSchema;

export const BadgeGetFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
});

export const BadgeGetFilesResponseSchema = z.array(FileSchema);
