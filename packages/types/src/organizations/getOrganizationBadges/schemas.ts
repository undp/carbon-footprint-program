import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { BadgeTypeSchema } from "../../baseSchemas/index.js";

export const GetOrganizationBadgesParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const GetOrganizationBadgesQuerySchema = z.object({
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

const GetOrganizationBadgesItemSchema = z.object({
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
});

export const GetOrganizationBadgesResponseSchema = z.array(
  GetOrganizationBadgesItemSchema
);
