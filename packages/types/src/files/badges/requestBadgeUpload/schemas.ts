import { z } from "zod";
import { BadgeTypeSchema } from "../../../baseSchemas/index.js";
import { PresignedUploadResponseSchema } from "../../schemas.js";

export const RequestBadgeUploadParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The badge type"),
});

export const RequestBadgeUploadBodySchema = z.object({
  originalName: z
    .string()
    .min(1)
    .max(255)
    .trim()
    .regex(/^[ -~]+$/, "File name must only contain printable ASCII characters")
    .refine(
      (name) => !/[/\\:]/.test(name),
      "File name must not contain path separators or colons"
    )
    .describe("The original file name"),
});

export const RequestBadgeUploadResponseSchema = PresignedUploadResponseSchema;
