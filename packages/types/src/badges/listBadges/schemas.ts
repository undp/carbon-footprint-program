import { z } from "zod";
import { BADGE_HISTORY_LIMIT } from "@repo/constants";
import { BadgeTypeSchema, BadgeStatusSchema } from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

export const BadgeDTOSchema = z.object({
  id: IdSchema.describe("The badge ID"),
  type: BadgeTypeSchema.describe("The badge type"),
  status: BadgeStatusSchema.describe("The badge status"),
  createdAt: z.iso.datetime().describe("The creation date"),
  fileName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The file MIME type"),
  previewUrl: z.url().describe("Short-lived read SAS URL for preview"),
});

export const BadgeCatalogEntrySchema = z.object({
  type: BadgeTypeSchema.describe("The badge type"),
  active: BadgeDTOSchema.nullable().describe(
    "The currently active badge, or null if none"
  ),
  history: z
    .array(BadgeDTOSchema)
    .max(BADGE_HISTORY_LIMIT)
    .describe(
      `Most recent inactive badges (capped at ${BADGE_HISTORY_LIMIT}), newest first`
    ),
});

export const ListBadgesResponseSchema = z.array(BadgeCatalogEntrySchema);
