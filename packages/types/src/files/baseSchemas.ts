import { z } from "zod";
import { IdSchema } from "../index.js";

export const FileTypeSchema = z.enum(["SUBMISSION", "BADGE"]);

export const BadgeTypeSchema = z.enum([
  "CARBON_INVENTORY",
  "ORGANIZATION_DATA",
]);

export const FileStatusSchema = z.enum(["ACTIVE", "DELETED"]);

export const BadgeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const SubmissionFileTypeSchema = z.enum(["ATTACHMENT", "RECOGNITION"]);

export const FileSchema = z.object({
  uuid: z.uuid().describe("The UUID of the file"),
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  status: FileStatusSchema.describe("The status of the file"),
  createdAt: z.iso.datetime().describe("The upload date"),
  deletedAt: z.iso.datetime().nullable().describe("The deletion date"),
});

export const BadgeSchema = z.object({
  id: IdSchema.describe("The ID of the badge"),
  type: BadgeTypeSchema.describe("The type of the badge"),
  status: BadgeStatusSchema.describe("The status of the badge"),
  file: FileSchema.describe("The file associated with the badge"),
  createdAt: z.iso.datetime().describe("The creation date of the badge"),
});
