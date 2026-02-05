import { z } from "zod";
import { makeAllFieldsNullable, IdSchema } from "../zod.js";

// Enums
export const InventoryStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "DELETED",
]);

export const UsageModeSchema = z.enum(["SIMPLIFIED", "EXPERT"]);

export const InputTypeSchema = z.enum(["DIRECT", "SIMPLIFIED", "EXPERT"]);

// Line schema
export const CarbonInventoryLineSchema = z
  .object({
    id: IdSchema.describe("The ID of the line"),
    subcategoryId: IdSchema.describe("The ID of the subcategory"),
    isManualTotalEmissions: z
      .boolean()
      .describe("Whether manual total emissions are used"),
    dimensionValue1Id: IdSchema.nullable().describe(
      "The ID of the first dimension value (position 1)"
    ),
    dimensionValue2Id: IdSchema.nullable().describe(
      "The ID of the second dimension value (position 2)"
    ),
    quantity: z
      .number()
      .nonnegative()
      .nullable()
      .describe("The quantity value"),
    measurementUnitId: IdSchema.nullable().describe(
      "The ID of the measurement unit"
    ),
    factorSource: z.string().nullable().describe("The source of the factor"),
    factorValue: z.number().nullable().describe("The factor value"),
    factorRateMeasurementUnitId: IdSchema.nullable().describe(
      "The ID of the rate measurement unit of the factor"
    ),
    comment: z.string().nullable().describe("Comment for the line"),
    manualTotalEmissions: z
      .number()
      .nullable()
      .describe("Manual total emissions value"),
  })
  .strict();

// Subcategory schema
export const CarbonInventorySubcategorySchema = z
  .object({
    id: IdSchema.describe("The ID of the subcategory"),
    isTotalManualEmissionsModeAvailable: z
      .boolean()
      .describe(
        "Whether manual total emissions mode is available for this subcategory"
      ),
    isTotalManualEmissionsModeActive: z
      .boolean()
      .describe("Whether manual total emissions are used"),
    lines: z
      .array(CarbonInventoryLineSchema)
      .describe("The lines associated with this subcategory"),
  })
  .strict();

// Entities
export const OrganizationDataSchema = makeAllFieldsNullable(
  z.object({
    name: z.string().describe("The name of the organization"),
    sectorId: IdSchema.describe("The ID of the sector"),
    subsectorId: IdSchema.describe("The ID of the subsector"),
    sizeId: IdSchema.describe("The ID of the organization size"),
    mainActivityId: IdSchema.describe("The ID of the main activity"),
    mainActivityQuantity: z.int().describe("The quantity of the main activity"),
  })
).strict();

export const CarbonInventorySchema = z
  .object({
    id: IdSchema.describe("The ID of the carbon inventory"),
    name: z.string().nullable().describe("The name of the carbon inventory"),
    organizationId: IdSchema.nullable().describe("The ID of the organization"),
    organizationBranchId: IdSchema.nullable().describe(
      "The ID of the organization branch"
    ),
    organizationData: OrganizationDataSchema.nullable().describe(
      "Organization data as JSON object"
    ),
    year: z
      .number()
      .int()
      .min(2000)
      .max(2100)
      .nullable()
      .describe("The year of the inventory"),
    status: InventoryStatusSchema.describe("The status of the inventory"),
    usageMode: UsageModeSchema.describe(
      "The usage mode (simplified or expert)"
    ),
    methodologyVersionId: IdSchema.nullable().describe(
      "The ID of the methodology version"
    ),
    preselectedNodesId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the preselected nodes"),
    isEditable: z.boolean().describe("Whether the inventory is editable"),
    createdAt: z.iso.datetime().describe("The creation timestamp"),
    updatedAt: z.iso.datetime().describe("The last update timestamp"),
    createdById: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the user who created the inventory"),
    updatedById: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the user who last updated the inventory"),
    subcategories: z
      .array(CarbonInventorySubcategorySchema)
      .describe("The subcategories associated with this inventory"),
  })
  .strict();
