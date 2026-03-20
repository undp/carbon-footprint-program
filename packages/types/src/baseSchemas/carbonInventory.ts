import { z } from "zod";
import { IdSchema } from "../zod.js";
import { InventoryStatus, UsageMode } from "../enums.js";

export const OrganizationDataFieldSchema = z
  .object({
    name: z.string().nullable().describe("The name of the organization"),
    sectorId: IdSchema.nullable().describe("The ID of the sector"),
    subsectorId: IdSchema.nullable().describe("The ID of the subsector"),
    sizeId: IdSchema.nullable().describe("The ID of the organization size"),
    mainActivityId: IdSchema.nullable().describe("The ID of the main activity"),
    mainActivityQuantity: z
      .int()
      .nullable()
      .describe("The quantity of the main activity"),
  })
  .strict()
  .nullable();

export type OrganizationDataField = z.infer<typeof OrganizationDataFieldSchema>;

export const CarbonInventoryBaseSchema = z
  .object({
    id: IdSchema.describe("The ID of the carbon inventory"),
    name: z.string().nullable().describe("The name of the carbon inventory"),
    organizationId: IdSchema.nullable().describe("The ID of the organization"),
    organizationBranchId: IdSchema.nullable().describe(
      "The ID of the organization branch"
    ),
    organizationData: OrganizationDataFieldSchema.describe(
      "The data of the organization"
    ),
    year: z
      .number()
      .int()
      .nullable()
      .describe("The year of the carbon inventory"),
    status: z
      .enum(InventoryStatus)
      .describe("The status of the carbon inventory"),
    usageMode: z
      .enum(UsageMode)
      .describe("The usage mode of the carbon inventory"),
    methodologyVersionId: IdSchema.nullable().describe(
      "The ID of the methodology version"
    ),
    preselectedNodesId: IdSchema.nullable().describe(
      "The ID of the preselected nodes"
    ),
    isSelfDeclared: z
      .boolean()
      .describe("Indicates if the carbon inventory is self-declared"),
    isEditable: z
      .boolean()
      .describe("Indicates if the carbon inventory is editable"),
    createdAt: z.iso
      .datetime()
      .describe("The creation date of the carbon inventory"),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .describe("The last update date of the carbon inventory"),
    createdById: IdSchema.nullable().describe(
      "The ID of the user who created the carbon inventory"
    ),
    updatedById: IdSchema.nullable().describe(
      "The ID of the user who last updated the carbon inventory"
    ),
  })
  .strict();
