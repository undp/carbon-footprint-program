import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";

export const EmissionFactorDimensionBaseSchema = z.object({
  id: IdSchema.describe("The ID of the dimension"),
  subcategoryId: IdSchema.describe(
    "The ID of the subcategory this dimension belongs to"
  ),
  code: z.string().describe("The code of the dimension"),
  name: z.string().describe("The name of the dimension"),
  position: z.number().int().describe("The position/order of the dimension"),
  isRequired: z.boolean().describe("Whether this dimension is required"),
  createdAt: z.iso.datetime().describe("The creation date of the dimension"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The last update date of the dimension"),
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created the dimension"),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who last updated the dimension"),
});
