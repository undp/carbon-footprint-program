import { z } from "zod";
import { BadgeTypeSchema } from "../../../baseSchemas/index.js";
import { BadgeDTOSchema } from "../../../badges/badgeDTO/schemas.js";

export const ConfirmBadgeUploadParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The type of the badge"),
});

export const ConfirmBadgeUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
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

export const ConfirmBadgeUploadResponseSchema = z.object({
  badge: BadgeDTOSchema,
});
