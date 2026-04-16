import { z } from "zod";
import { IdSchema } from "../zod.js";
import { CategoryStatus } from "../enums.js";
import { IconNameSchema } from "../common/index.js";

export const CategoryStatusSchema = z.enum(CategoryStatus);

const HEX_RGB_REGEX = /^#[0-9A-Fa-f]{3}$/;
const HEX_RGBA_REGEX = /^#[0-9A-Fa-f]{4}$/;
const HEX_RRGGBB_REGEX = /^#[0-9A-Fa-f]{6}$/;
const HEX_RRGGBBAA_REGEX = /^#[0-9A-Fa-f]{8}$/;

export const CategoryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the category"),
  methodologyVersionId: IdSchema.describe("The ID of the methodology version"),
  name: z.string().trim().min(1).max(255).describe("The name of the category"),
  icon: IconNameSchema.describe("The icon identifier"),
  color: z
    .union([
      z.string().regex(HEX_RGB_REGEX),
      z.string().regex(HEX_RGBA_REGEX),
      z.string().regex(HEX_RRGGBB_REGEX),
      z.string().regex(HEX_RRGGBBAA_REGEX),
    ])
    .describe("Hex color code in #RGB, #RGBA, #RRGGBB, or #RRGGBBAA format"),
  synonyms: z.string().trim().min(1).describe("Comma-separated synonyms"),
  description: z
    .string()
    .trim()
    .min(1)
    .describe("The description of the category"),
  explanationSlug: z
    .string()
    .nullable()
    .describe(
      "The slug of the explanation associated with this category, if any"
    ),
  examples: z.string().nullable().describe("Example text"),
  position: z.number().int().min(1).describe("The display position"),
  status: CategoryStatusSchema.describe("The status of the category"),
  createdAt: z.iso.datetime().describe("The creation date of the category"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The last update date of the category"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the category"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the category"
  ),
});
