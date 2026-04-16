import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetTransparencyDataQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, "Year must be a 4-digit year")
    .optional()
    .describe("Filter by year"),
});

const TransparencyRecognitionsSchema = z.object({
  CARBON_INVENTORY_CALCULATION: z
    .boolean()
    .describe("Whether the organization has a measurement recognition"),
  CARBON_INVENTORY_VERIFICATION: z
    .boolean()
    .describe("Whether the organization has a verification recognition"),
  REDUCTION_PROJECT_VERIFICATION: z
    .boolean()
    .describe("Whether the organization has a reduction recognition"),
  NEUTRALIZATION_PLAN_VERIFICATION: z
    .boolean()
    .describe("Whether the organization has a neutralization recognition"),
});

const TransparencyOrganizationSchema = z.object({
  organizationId: IdSchema.describe("The organization ID"),
  organizationName: z.string().describe("The name of the organization"),
  sectorName: z.string().nullable().describe("The sector name"),
  subsectorName: z.string().nullable().describe("The subsector name"),
  recognitions: TransparencyRecognitionsSchema.describe(
    "Recognition seals granted to the organization"
  ),
  years: z
    .array(z.number().int())
    .describe(
      "Years for which the organization has inventories with recognitions"
    ),
});

export const GetTransparencyDataResponseSchema = z.array(
  TransparencyOrganizationSchema
);
