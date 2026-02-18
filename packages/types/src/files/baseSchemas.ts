import { z } from "zod";

export const FileTypeSchema = z.enum(["SUBMISSION_ATTACHMENT"]);

export const FileStatusSchema = z.enum(["ACTIVE", "DELETED"]);

export const FileSchema = z.object({
  uuid: z.uuid().describe("The UUID of the file"),
  fileType: FileTypeSchema.describe("The type of file"),
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  status: FileStatusSchema.describe("The status of the file"),
  createdAt: z.iso.datetime().describe("The upload date"),
  deletedAt: z.iso.datetime().nullable().describe("The deletion date"),
});
