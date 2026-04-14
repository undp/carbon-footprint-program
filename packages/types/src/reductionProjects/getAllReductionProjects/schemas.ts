import { z } from "zod";
import { ReductionProjectDisplayStatusSchema } from "../schemas.js";
import { IdSchema } from "../../zod.js";

export const GetAllReductionProjectsQuerySchema = z.object({
  organizationId: IdSchema.optional().describe(
    "Filter by organization ID. Omit for all accessible organizations."
  ),
  year: z
    .string()
    .regex(/^\d+$/, "Year must be a valid number")
    .optional()
    .describe('Filter by reporting year (e.g. "2024")'),
});

const ReductionProjectListItemSchema = z.object({
  id: IdSchema.describe("The ID of the reduction project"),
  name: z.string().describe("The name of the reduction project"),
  year: z
    .number()
    .int()
    .nullable()
    .describe("Reporting year for scenario metrics"),
  firstReportDate: z.iso
    .datetime()
    .describe("First report timestamp (creation time of the project row)"),
  totalReduction: z
    .number()
    .nullable()
    .describe(
      "baselineScenario minus projectScenario when both are set; otherwise null"
    ),
  status: ReductionProjectDisplayStatusSchema.describe(
    "Workflow display status derived from submissions"
  ),
});

export const GetAllReductionProjectsResponseSchema = z.array(
  ReductionProjectListItemSchema
);
