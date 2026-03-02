import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { CategoryStatus } from "../enums.js";

export const CategoryStatusSchema = z.enum(CategoryStatus);

export const CategoryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the category"),
  methodologyVersionId: IdSchema.describe("The ID of the methodology version"),
  name: z.string().min(1).max(255).describe("The name of the category"),
  icon: z.string().min(1).max(255).describe("The icon identifier"),
  color: z.string().min(1).max(50).describe("The color code in HEX format"),
  synonyms: z.string().min(1).describe("Comma-separated synonyms"),
  description: z.string().min(1).describe("The description of the category"),
  examples: z.string().nullable().describe("Example text"),
  position: z.number().int().min(1).describe("The display position"),
  status: CategoryStatusSchema.describe("The status of the category"),
  createdAt: z.iso.datetime().describe("The creation date of the category"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The last update date of the category"),
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created the category"),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who last updated the category"),
});
