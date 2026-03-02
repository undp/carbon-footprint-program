import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { OrganizationStatus } from "../enums.js";

export const OrganizationStatusSchema = z.enum(OrganizationStatus);

export const OrganizationBaseSchema = z.object({
  id: IdSchema,
  countryId: IdSchema,
  status: OrganizationStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  createdById: UserBaseSchema.shape.id.nullable(),
  updatedById: UserBaseSchema.shape.id.nullable(),
});
