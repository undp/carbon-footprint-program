import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { CarbonInventoryLineStatus } from "../enums.js";

export const CarbonInventoryLineStatusSchema = z.enum(
  CarbonInventoryLineStatus
);

export const CarbonInventoryLineBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the carbon inventory line."),
  carbonInventoryId: IdSchema.describe(
    "The ID of the associated carbon inventory."
  ),
  subcategoryId: IdSchema.describe("The ID of the associated subcategory."),
  status: CarbonInventoryLineStatusSchema.describe(
    "The status of the carbon inventory line."
  ),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the carbon inventory line was created."),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe(
      "The date and time when the carbon inventory line was last updated."
    ),
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created the carbon inventory line."),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who last updated the carbon inventory line."),
});
