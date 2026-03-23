import { z } from "zod";
import { IdSchema } from "../zod.js";

// Enums
export const GreenhouseGasSchema = z.enum([
  "CO2",
  "CH4",
  "HIDROFLUOROCARBONADOS",
  "PERFLUOROCARBONADOS",
  "SF6",
  "NF3",
]);

export const ReductionProjectStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "OBJECTED",
]);

export const ReductionProjectFileTypeSchema = z.enum([
  "REDUCTION_REPORT",
  "VERIFICATION_REPORT",
  "SELF_DECLARATION",
]);

// File schema
export const ReductionProjectFileSchema = z
  .object({
    id: IdSchema.describe("The ID of the file"),
    reductionProjectId: IdSchema.describe(
      "The ID of the associated reduction project"
    ),
    fileType: ReductionProjectFileTypeSchema.describe("The type of file"),
    fileName: z.string().describe("The name of the file"),
    fileUrl: z.string().describe("The URL of the file"),
    fileSizeBytes: z.number().int().nullable().describe("The file size in bytes"),
    mimeType: z.string().nullable().describe("The MIME type of the file"),
  })
  .strict();

// Report schema
export const ReductionProjectReportSchema = z
  .object({
    id: IdSchema.describe("The ID of the report"),
    reductionProjectId: IdSchema.describe(
      "The ID of the associated reduction project"
    ),
    reductionYear: z.number().int().describe("The year of the reduction"),
    baselineValue: z.number().describe("Baseline scenario value in tCO2e"),
    projectValue: z.number().describe("Project scenario value in tCO2e"),
    reductionValue: z
      .number()
      .describe("Calculated reduction value (baseline - project)"),
    createdAt: z.iso.datetime().describe("The creation timestamp"),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .describe("The last update timestamp"),
  })
  .strict();

// Main entity schema
export const ReductionProjectSchema = z
  .object({
    id: IdSchema.describe("The ID of the reduction project"),
    organizationId: IdSchema.describe("The ID of the organization"),
    organizationBranchId: IdSchema.nullable().describe(
      "The ID of the organization branch"
    ),
    name: z.string().describe("The name of the reduction project"),
    description: z.string().nullable().describe("Project description"),
    implementationDate: z
      .string()
      .nullable()
      .describe("The implementation date (ISO date string)"),
    subcategoryId: IdSchema.nullable().describe(
      "The ID of the emission subcategory"
    ),
    pcg: z.string().nullable().describe("PCG version (AR5, AR4, SAR)"),
    usePcgNationalInventory: z
      .boolean()
      .describe("Whether to use the national inventory PCG"),
    selectedGases: z
      .array(GreenhouseGasSchema)
      .describe("Selected greenhouse gases"),
    reportedInOtherInitiative: z
      .boolean()
      .describe("Whether the project has been reported in another initiative"),
    otherInitiativeDescription: z
      .string()
      .nullable()
      .describe("Description of the other initiative"),
    status: ReductionProjectStatusSchema.describe(
      "The status of the reduction project"
    ),
    reports: z
      .array(ReductionProjectReportSchema)
      .describe("The annual reduction reports"),
    files: z
      .array(ReductionProjectFileSchema)
      .describe("The files associated with this project"),
    createdAt: z.iso.datetime().describe("The creation timestamp"),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .describe("The last update timestamp"),
  })
  .strict();
