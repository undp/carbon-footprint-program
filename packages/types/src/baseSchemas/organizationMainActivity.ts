import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";

export const OrganizationMainActivityBaseSchema = z.object({
  id: IdSchema,
  name: z.string(),
  countrySectorId: IdSchema.nullable(),
  countrySubsectorId: IdSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  createdById: UserBaseSchema.shape.id.nullable(),
  updatedById: UserBaseSchema.shape.id.nullable(),
});
