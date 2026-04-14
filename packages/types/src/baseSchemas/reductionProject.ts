import { z } from "zod";
import { IdSchema } from "../zod.js";
import { ReductionProjectStatus } from "../enums.js";
import { ConsideredGeiSchema } from "../common/consideredGei/schemas.js";
import { GwpSourceSchema } from "../common/gwpSource/schemas.js";
import { REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH } from "@repo/constants";

export const ReductionProjectBaseSchema = z
  .object({
    id: IdSchema.describe("The ID of the reduction project"),
    name: z.string().describe("The name of the reduction project"),
    organizationId: IdSchema.describe("The ID of the organization"),
    carbonInventoryId: IdSchema.describe(
      "The ID of the linked carbon inventory"
    ),
    implementationDate: z.iso
      .datetime()
      .describe("Implementation date of the project"),
    description: z
      .string()
      .max(REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH)
      .describe("Description of the reduction project"),
    subcategoryId: IdSchema.describe("The ID of the subcategory"),
    gwpUsed: GwpSourceSchema.nullable().describe(
      "GWP set used for the assessment"
    ),
    consideredGei: z
      .array(ConsideredGeiSchema)
      .describe("GHG species considered in the project"),
    reportedElsewhere: z
      .boolean()
      .describe("Whether emissions are reported elsewhere"),
    reportedElsewhereDescription: z
      .string()
      .max(REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH)
      .nullable()
      .describe("Details when reported elsewhere"),
    year: z
      .number()
      .int()
      .nullable()
      .describe("Reporting year for scenario metrics"),
    baselineScenario: z
      .string()
      .describe("Baseline scenario emissions (decimal as string)"),
    projectScenario: z
      .string()
      .describe("Project scenario emissions (decimal as string)"),
    status: z
      .enum(ReductionProjectStatus)
      .describe("Persistence status of the reduction project record"),
    createdAt: z.iso
      .datetime()
      .describe("When the reduction project was created"),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .describe("When the reduction project was last updated"),
    createdById: IdSchema.nullable().describe("ID of the user who created it"),
    updatedById: IdSchema.nullable().describe(
      "ID of the user who last updated it"
    ),
  })
  .strict();
