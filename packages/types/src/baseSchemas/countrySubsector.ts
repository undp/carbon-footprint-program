import { z } from "zod";
import { CountrySubsectorStatus } from "@repo/database/enums";
import { IdSchema } from "../zod.js";

export const CountrySubsectorBaseSchema = z.object({
  id: IdSchema.describe("The ID of the subsector"),
  countrySectorId: IdSchema.describe("The ID of the country sector"),
  name: z.string().min(1).describe("The name of the subsector"),
  description: z
    .string()
    .nullable()
    .describe("Optional description of the subsector"),
  status: z
    .enum(CountrySubsectorStatus)
    .describe("Lifecycle status of the subsector"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this subsector"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this subsector"
  ),
});
