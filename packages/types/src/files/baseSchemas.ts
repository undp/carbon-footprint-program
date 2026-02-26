import { z } from "zod";
import { IdSchema } from "../zod.js";
import {
  BadgeStatus,
  BadgeType,
  FileStatus,
  SubmissionFileType,
} from "@repo/database/enums";

export const FileTypeSchema = z.enum(["SUBMISSION", "BADGE"]);

export const BadgeTypeSchema = z.enum(BadgeType);

export const FileStatusSchema = z.enum(FileStatus);

export const BadgeStatusSchema = z.enum(BadgeStatus);

export const SubmissionFileTypeSchema = z.enum(SubmissionFileType);

export const FileSchema = z.object({
  uuid: z.uuid().describe("The UUID of the file"),
  originalName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  status: FileStatusSchema.describe("The status of the file"),
  createdAt: z.iso.datetime().describe("The upload date"),
  deletedAt: z.iso.datetime().nullable().describe("The deletion date"),
});

export const SignedUrlResponseSchema = z.object({
  url: z.url().describe("Temporary signed URL"),
  expiresAt: z.iso.datetime().describe("When the URL expires"),
});

export const BadgeSchema = z.object({
  id: IdSchema.describe("The ID of the badge"),
  type: BadgeTypeSchema.describe("The type of the badge"),
  status: BadgeStatusSchema.describe("The status of the badge"),
  file: FileSchema.describe("The file associated with the badge"),
  createdAt: z.iso.datetime().describe("The creation date of the badge"),
});
