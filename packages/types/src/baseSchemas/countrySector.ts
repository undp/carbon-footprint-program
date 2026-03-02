import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";

export const CountrySectorBaseSchema = z.object({
  id: IdSchema.describe("The ID of the country sector"),
  countryId: IdSchema.describe("The ID of the country"),
  name: z.string().describe("The name of the country sector"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created this sector"),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who last updated this sector"),
});
