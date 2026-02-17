import { z } from "zod";
import { IdSchema } from "../zod.js";

import { MethodologyVersionStatus } from "@repo/database/enums";

// Enums
export const MethodologyVersionStatusSchema = z.enum(MethodologyVersionStatus);

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
    name: z
      .string()
      .min(1, "Required field")
      .describe("The name of the methodology"),
    description: z
      .string()
      .min(1, "Required field")
      .describe("The description of the methodology"),
    regulation: z
      .string()
      .min(1, "Required field")
      .describe("The regulation/standard reference"),
    version: z
      .string()
      .min(1, "Required field")
      .describe("The version identifier"),
    status: MethodologyVersionStatusSchema.describe(
      "The status of the methodology"
    ),
    createdAt: z.iso.datetime().describe("The creation timestamp"),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .describe("The last update timestamp"),
    createdById: IdSchema.nullable().describe(
      "The ID of the user who created this"
    ),
    updatedById: IdSchema.nullable().describe(
      "The ID of the user who last updated this"
    ),
  })
  .strict();

// Extended schema with related data (for GET responses)
export const MethodologyWithCountsSchema = MethodologySchema.extend({
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
    .describe(
      "Number of carbon inventories in DRAFT, SUBMITTED, or VERIFIED status using this methodology"
    ),
});
