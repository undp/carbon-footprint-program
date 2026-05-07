import { z } from "zod";
import { FileStatus } from "../enums.js";

export const RouteFileTypeSchema = z.enum(["SUBMISSION", "BADGE", "LEGAL"]);

export const FileStatusSchema = z.enum(FileStatus);

export const FileBaseSchema = z.object({
  uuid: z.uuid().describe("The UUID of the file"),
  originalName: z.string().min(1).max(255).describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  status: FileStatusSchema.describe("The status of the file"),
  createdAt: z.iso.datetime().describe("The upload date"),
  deletedAt: z.iso.datetime().nullable().describe("The deletion date"),
});
