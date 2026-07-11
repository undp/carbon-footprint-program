import { z } from "zod";
import { ReductionProjectDisplayStatusSchema } from "../schemas.js";
import { IdSchema } from "../../zod.js";
import { ReductionProjectBaseSchema } from "../../baseSchemas/reductionProject.js";
import { OrganizationDisplayStatusSchema } from "../../organizations/index.js";

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

// Keeps the raw completeness fields so the actions cell can compute the "why
// can't submit" state client-side via the shared `getReductionProjectMissingFields`
// — mirrors carbon inventories (raw fields + client compute), no server-computed
// `missingFields`. `gwpUsed`/`reportedElsewhere`/`reportedElsewhereDescription`
// stay in the item because they are completeness inputs (see the shared util).
const ReductionProjectListItemSchema = ReductionProjectBaseSchema.omit({
  status: true,
  carbonInventoryId: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
}).extend({
  organizationName: z
    .string()
    .nullable()
    .describe("Name of the organization, or null if none"),
  organizationDisplayStatus:
    OrganizationDisplayStatusSchema.nullable().describe(
      "Display status of the associated organization, or null if none"
    ),
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
