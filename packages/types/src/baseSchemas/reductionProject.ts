import { z } from "zod";
import { IdSchema } from "../zod.js";
import { InventoryStatus } from "../enums.js";

export const ReductionProjectBaseSchema = z
  .object({
    id: IdSchema.describe("The ID of the reduction project"),
    name: z.string().nullable().describe("The name of the reduction project"),
    organizationId: IdSchema.nullable().describe("The ID of the organization"),
    carbonInventoryId: IdSchema.nullable().describe(
      "The ID of the linked carbon inventory"
    ),
    implementationDate: z.iso
      .datetime()
      .nullable()
      .describe("Implementation date of the project"),
    description: z
      .string()
      .nullable()
      .describe("Description of the reduction project"),
    subcategoryId: IdSchema.nullable().describe("The ID of the subcategory"),
    gwpUsed: z.string().nullable().describe("GWP set used for the assessment"),
    useNationalGwp: z
      .boolean()
      .describe("Whether national GWP values are used"),
    consideredGei: z
      .array(z.string())
      .describe("GHG species considered in the project"),
    reportedElsewhere: z
      .boolean()
      .describe("Whether emissions are reported elsewhere"),
    reportedElsewhereDescription: z
      .string()
      .nullable()
      .describe("Details when reported elsewhere"),
    year: z
      .number()
      .int()
      .nullable()
      .describe("Reporting year for scenario metrics"),
    baselineScenario: z
      .string()
      .nullable()
      .describe("Baseline scenario emissions (decimal as string)"),
    projectScenario: z
      .string()
      .nullable()
      .describe("Project scenario emissions (decimal as string)"),
    status: z
      .enum(InventoryStatus)
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
