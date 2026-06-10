import { z } from "zod";
import { BadgeTypeSchema, FilenameSchema } from "../../../baseSchemas/index.js";
import { BadgeDTOSchema } from "../../../badges/listBadges/schemas.js";

export const ConfirmBadgeUploadParamsSchema = z.object({
  badgeType: BadgeTypeSchema.describe("The type of the badge"),
});

export const ConfirmBadgeUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: FilenameSchema.describe("The original file name"),
});

export const ConfirmBadgeUploadResponseSchema = z.object({
  badge: BadgeDTOSchema.describe("The newly created badge (INACTIVE)"),
});
