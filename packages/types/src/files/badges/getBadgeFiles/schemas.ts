import { z } from "zod";
import {
  BadgeTypeSchema,
  FileBaseSchema,
  FileStatusSchema,
} from "../../../baseSchemas/index.js";

export const GetBadgeFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
});

export const GetBadgeFilesParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const GetBadgeFilesResponseSchema = z.array(FileBaseSchema);
