import { z } from "zod";
import { FILE_UPLOAD_TYPES } from "@repo/constants";
import { FileStatus } from "../enums.js";
import { FilenameSchema } from "./filename.js";

// Derived from FILE_UPLOAD_TYPES so the route contract and the upload
// policy map in @repo/constants can never drift apart.
export const RouteFileTypeSchema = z.enum(FILE_UPLOAD_TYPES);

export const FileStatusSchema = z.enum(FileStatus);

export const FileBaseSchema = z.object({
  uuid: z.uuid().describe("The UUID of the file"),
  originalName: FilenameSchema.describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  status: FileStatusSchema.describe("The status of the file"),
  createdAt: z.iso.datetime().describe("The upload date"),
  deletedAt: z.iso.datetime().nullable().describe("The deletion date"),
});
