import { z } from "zod";
import { IdSchema } from "../zod.js";

export { MethodologyVersionStatus } from "@repo/database/enums";

// Enums
export const MethodologyVersionStatusSchema = z.enum([
  "PUBLISHED",
  "UNPUBLISHED",
  "DELETED",
]);

// Country schema for responses
export const MethodologyCountrySchema = z
  .object({
    id: IdSchema.describe("The ID of the country"),
    name: z.string().describe("The name of the country"),
    isoCode: z.string().describe("The ISO code of the country"),
  })
  .strict();

// Base Methodology schema
export const MethodologySchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology"),
    countryId: IdSchema.describe("The ID of the country"),
    name: z.string().describe("The name of the methodology"),
    description: z.string().describe("The description of the methodology"),
    regulation: z.string().describe("The regulation/standard reference"),
    version: z.string().describe("The version identifier"),
    status: MethodologyVersionStatusSchema.describe(
      "The status of the methodology"
    ),
    createdAt: z.iso.datetime().describe("The creation timestamp"),
    updatedAt: z.iso.datetime().describe("The last update timestamp"),
    createdById: IdSchema.nullable().describe(
      "The ID of the user who created this"
    ),
    updatedById: IdSchema.nullable().describe(
      "The ID of the user who last updated this"
    ),
  })
  .strict();

// Extended schema with related data (for GET responses)
export const MethodologyWithRelationsSchema = MethodologySchema.extend({
  country: MethodologyCountrySchema.optional().describe(
    "The country this methodology belongs to"
  ),
  categoryCount: z
    .number()
    .int()
    .optional()
    .describe("Number of categories in this methodology"),
  carbonInventoryCount: z
    .number()
    .int()
    .optional()
    .describe("Number of carbon inventories using this methodology"),
});

// TypeScript Types
export type MethodologyCountry = z.infer<typeof MethodologyCountrySchema>;
export type Methodology = z.infer<typeof MethodologySchema>;
export type MethodologyWithRelations = z.infer<
  typeof MethodologyWithRelationsSchema
>;
