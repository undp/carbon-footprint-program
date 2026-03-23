import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  GreenhouseGasSchema,
  ReductionProjectSchema,
} from "../baseSchemas.js";

export const CreateReductionProjectBodySchema = z
  .object({
    organizationId: IdSchema.describe("The ID of the organization"),
    organizationBranchId: IdSchema.optional().describe(
      "The ID of the organization branch"
    ),
    name: z.string().min(1).describe("The name of the reduction project"),
    description: z.string().optional().describe("Project description"),
    implementationDate: z
      .string()
      .optional()
      .describe("The implementation date (ISO date string)"),
    subcategoryId: IdSchema.optional().describe(
      "The ID of the emission subcategory"
    ),
    pcg: z.string().optional().describe("PCG version (AR5, AR4, SAR)"),
    usePcgNationalInventory: z
      .boolean()
      .optional()
      .describe("Whether to use the national inventory PCG"),
    selectedGases: z
      .array(GreenhouseGasSchema)
      .optional()
      .describe("Selected greenhouse gases"),
    reportedInOtherInitiative: z
      .boolean()
      .optional()
      .describe("Whether reported in another initiative"),
    otherInitiativeDescription: z
      .string()
      .optional()
      .describe("Description of the other initiative"),
  })
  .strict();

export const CreateReductionProjectResponseSchema = ReductionProjectSchema.omit(
  { files: true, reports: true }
);
