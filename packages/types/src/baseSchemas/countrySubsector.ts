import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";

export const CountrySubsectorBaseSchema = z.object({
  id: IdSchema.describe("The ID of the subsector"),
  countrySectorId: IdSchema.describe("The ID of the country sector"),
  name: z.string().min(1).describe("The name of the subsector"),
  createdAt: z.date().describe("The creation date"),
  updatedAt: z.date().nullable().describe("The update date"),
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created this subsector"),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who last updated this subsector"),
});
