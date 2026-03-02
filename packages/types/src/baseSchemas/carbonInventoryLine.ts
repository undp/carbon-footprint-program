import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { CarbonInventoryLineStatus } from "../enums.js";

export const CarbonInventoryLineStatusSchema = z.enum(
  CarbonInventoryLineStatus
);

export const CarbonInventoryLineBaseSchema = z.object({
  id: IdSchema,
  carbonInventoryId: IdSchema,
  subcategoryId: IdSchema,
  status: CarbonInventoryLineStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  createdById: UserBaseSchema.shape.id.nullable(),
  updatedById: UserBaseSchema.shape.id.nullable(),
});
