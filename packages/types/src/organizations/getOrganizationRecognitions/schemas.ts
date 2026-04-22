import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubmissionTypeSchema } from "../../baseSchemas/index.js";

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
  submissionTypes: z
    .union([SubmissionTypeSchema, z.array(SubmissionTypeSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional()
    .describe("Filter by submission type(s). Can be repeated."),
});

const GetOrganizationRecognitionsItemSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
  earningDate: z.iso
    .datetime()
    .nullable()
    .describe("The date the recognition was earned (submission updatedAt)"),
  measurementYear: z
    .number()
    .int()
    .describe("The measurement year of the carbon inventory"),
  submissionType: SubmissionTypeSchema.describe("The type of submission"),
  totalEmissions: z
    .number()
    .nullable()
    .describe(
      "Total emissions in tCO₂e for the carbon inventory, or null for reduction project recognitions"
    ),
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
