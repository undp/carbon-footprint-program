import { z } from "zod";
import {
  ReductionProjectBaseSchema,
  OrganizationSummaryBaseSchema,
} from "../../baseSchemas/index.js";
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

const ReductionProjectListItemSchema = ReductionProjectBaseSchema.omit({
  status: true,
}).extend({
  organizationName: OrganizationSummaryBaseSchema.shape.name
    .nullable()
    .describe("Legal or trade name of the organization"),
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
