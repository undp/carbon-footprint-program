import { z } from "zod";
import { IdSchema } from "../zod.js";
import { BadgeStatus, BadgeType } from "../enums.js";

export const BadgeTypeSchema = z.enum(BadgeType);

export const BadgeStatusSchema = z.enum(BadgeStatus);

export const BadgeBaseSchema = z.object({
  id: IdSchema.describe("The ID of the badge"),
  type: BadgeTypeSchema.describe("The type of the badge"),
  status: BadgeStatusSchema.describe("The status of the badge"),
  fileId: IdSchema.describe("The file associated with the badge"),
  createdAt: z.iso.datetime().describe("The creation date of the badge"),
});
