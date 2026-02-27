import { z } from "zod";
import { IdSchema } from "../zod.js";
import { MethodologyVersionStatus } from "@repo/database/enums";

export const MethodologySchema = z.strictObject({
  id: IdSchema.describe("The ID of the methodology"),
  countryId: IdSchema.describe("The ID of the country"),
  name: z
    .string()
    .min(1, "Campo requerido")
    .describe("The name of the methodology"),
  description: z
    .string()
    .min(1, "Campo requerido")
    .describe("The description of the methodology"),
  regulation: z
    .string()
    .min(1, "Campo requerido")
    .describe("The regulation/standard reference"),
  version: z
    .string()
    .min(1, "Campo requerido")
    .describe("The version identifier"),
  status: z
    .enum(MethodologyVersionStatus)
    .describe("The status of the methodology"),
  createdAt: z.iso.datetime().describe("The creation timestamp"),
  updatedAt: z.iso.datetime().nullable().describe("The last update timestamp"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this"
  ),
});
