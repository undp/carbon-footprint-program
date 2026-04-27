import { z } from "zod";
import { CountrySectorStatus } from "@repo/database/enums";
import { IdSchema } from "../zod.js";

export const CountrySectorBaseSchema = z.object({
  id: IdSchema.describe("The ID of the country sector"),
  countryId: IdSchema.describe("The ID of the country"),
  name: z.string().describe("The name of the country sector"),
  description: z
    .string()
    .nullable()
    .describe("Optional description of the country sector"),
  status: z
    .enum(CountrySectorStatus)
    .describe("Lifecycle status of the country sector"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this sector"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this sector"
  ),
});
