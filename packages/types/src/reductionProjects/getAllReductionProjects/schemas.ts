import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  ReductionProjectSchema,
  ReductionProjectStatusSchema,
} from "../baseSchemas.js";

export const GetAllReductionProjectsQuerySchema = z.object({
  organizationId: IdSchema.describe("The ID of the organization"),
  branchId: IdSchema.optional().describe(
    "Optional organization branch filter"
  ),
  status: ReductionProjectStatusSchema.optional().describe(
    "Optional status filter"
  ),
});

export const ReductionProjectSummarySchema = ReductionProjectSchema.omit({
  files: true,
  reports: true,
  description: true,
  selectedGases: true,
  reportedInOtherInitiative: true,
  otherInitiativeDescription: true,
  pcg: true,
  subcategoryId: true,
  implementationDate: true,
}).extend({
  firstReportDate: z.iso
    .datetime()
    .nullable()
    .describe("The date of the first report (null if no reports yet)"),
  reportYears: z
    .array(z.number().int())
    .describe("Distinct reduction years from all reports"),
  totalReduction: z
    .number()
    .describe("Sum of reductionValue across all reports (tCO₂e)"),
});

export const GetAllReductionProjectsResponseSchema = z.array(
  ReductionProjectSummarySchema
);
