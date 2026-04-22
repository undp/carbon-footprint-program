import { z } from "zod";
import { BadgeTypeSchema, BadgeStatusSchema } from "../../baseSchemas/index.js";

export const BadgeDTOSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The badge ID"),
  type: BadgeTypeSchema.describe("The badge type"),
  status: BadgeStatusSchema.describe("The badge status"),
  createdAt: z.iso.datetime().describe("When the badge was created"),
  fileName: z.string().describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the badge file"),
  previewUrl: z.url().describe("Short-lived read SAS URL for the badge image"),
});

export const BadgeCatalogEntrySchema = z.object({
  type: BadgeTypeSchema.describe("The badge type"),
  active: BadgeDTOSchema.nullable().describe(
    "The currently active badge for this type, or null if none"
  ),
  history: z
    .array(BadgeDTOSchema)
    .describe(
      "The most recent inactive badges for this type, newest first, capped at 20"
    ),
});
