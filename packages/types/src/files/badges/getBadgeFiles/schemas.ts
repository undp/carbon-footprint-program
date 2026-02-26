import { z } from "zod";
import {
  FileSchema,
  FileStatusSchema,
  BadgeTypeSchema,
} from "../../baseSchemas.js";

export const GetBadgeFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
});

export const GetBadgeFilesParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const GetBadgeFilesResponseSchema = z.array(FileSchema);
