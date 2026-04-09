import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { BadgeTypeSchema } from "../../baseSchemas/index.js";

export const GetOrganizationRecognitionsParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const GetOrganizationRecognitionsQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, "Year must be a 4-digit year")
    .optional()
    .describe(
      'Optional year filter. Must be a number (e.g., "2024"). Omit to get all years.'
    ),
  badgeTypes: z
    .union([BadgeTypeSchema, z.array(BadgeTypeSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional()
    .describe("Filter by badge type(s). Can be repeated."),
});

const GetOrganizationRecognitionsItemSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
  earningDate: z.iso
    .datetime()
    .nullable()
    .describe("The date the badge was earned (submission updatedAt)"),
  measurementYear: z
    .number()
    .int()
    .describe("The measurement year of the carbon inventory"),
  badgeType: BadgeTypeSchema.describe("The type of badge"),
  totalEmissions: z
    .number()
    .describe("Total emissions in tCO₂e for the carbon inventory"),
  recognitionFileUrl: z
    .string()
    .nullable()
    .describe(
      "Signed SAS URL for the recognition file associated with this submission, or null if not available"
    ),
});

export const GetOrganizationRecognitionsResponseSchema = z.array(
  GetOrganizationRecognitionsItemSchema
);
