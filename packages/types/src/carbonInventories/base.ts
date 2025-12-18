import { z } from "zod";
import { makeAllFieldsNullable } from "../zod.js";

// Enums
export const InventoryStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "DELETED",
]);

export const UsageModeSchema = z.enum(["SIMPLIFIED", "EXPERT"]);

// Entities
const _OrganizationDataSchema = z
  .object({
    name: z.string().describe("The name of the organization"),
    sector_id: z.string().regex(/^\d+$/).describe("The ID of the sector"),
    subsector_id: z.string().regex(/^\d+$/).describe("The ID of the subsector"),
    size_id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of the organization size"),
    main_activity_id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of the main activity"),
    main_activity_quantity: z
      .int()
      .describe("The quantity of the main activity"),
  })
  .partial()
  .strict();

export const OrganizationDataSchema = makeAllFieldsNullable(
  _OrganizationDataSchema
);

export const CarbonInventorySchema = z
  .object({
    id: z.string().regex(/^\d+$/).describe("The ID of the carbon inventory"),
    organizationId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the organization"),
    organizationBranchId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the organization branch"),
    organizationData: OrganizationDataSchema.describe(
      "Organization data as JSON object"
    ),
    year: z
      .number()
      .int()
      .min(2000)
      .max(2100)
      .describe("The year of the inventory"),
    status: InventoryStatusSchema.describe("The status of the inventory"),
    usageMode: UsageModeSchema.describe(
      "The usage mode (simplified or expert)"
    ),
    methodologyVersionId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the methodology version"),
    preselectedNodesId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the preselected nodes"),
    isEditable: z.boolean().describe("Whether the inventory is editable"),
    createdAt: z.string().datetime().describe("The creation timestamp"),
    updatedAt: z.string().datetime().describe("The last update timestamp"),
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
  })
  .strict();

// TypeScript Types
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>;
export type UsageMode = z.infer<typeof UsageModeSchema>;
export type OrganizationData = z.infer<typeof OrganizationDataSchema>;
export type CarbonInventory = z.infer<typeof CarbonInventorySchema>;
