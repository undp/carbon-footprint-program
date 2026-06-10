import { z } from "zod";
import { BadgeTypeSchema, FilenameSchema } from "../../../baseSchemas/index.js";

export const RequestBadgeUploadParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const RequestBadgeUploadBodySchema = z.object({
  originalName: FilenameSchema.describe("The original file name"),
});

export const RequestBadgeUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The generated file UUID"),
  uploadUrl: z.url().describe("Temporary signed URL for uploading the file"),
  expiresAt: z.iso.datetime().describe("When the upload URL expires"),
});
