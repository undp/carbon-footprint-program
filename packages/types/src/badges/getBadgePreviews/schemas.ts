import { z } from "zod";
import { BadgeTypeSchema } from "../../baseSchemas/index.js";

const GetBadgePreviewsItemSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The type of badge"),
  previewUrl: z.url().describe("Signed SAS URL for the badge seal image"),
});

export const GetBadgePreviewsResponseSchema = z.array(
  GetBadgePreviewsItemSchema
);

export const GetBadgePreviewsQuerySchema = z.object({
  badgeTypes: z
    .union([BadgeTypeSchema, z.array(BadgeTypeSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional()
    .describe("Filter by badge type(s). Can be repeated."),
});
