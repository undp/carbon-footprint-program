import { z } from "zod";

// Enums
export const InventoryStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "DELETED",
]);

export const UsageModeSchema = z.enum(["SIMPLIFIED", "EXPERT"]);

// Organization Data Schema
export const OrganizationDataSchema = z
  .object({
    name: z
      .string()
      .describe("The name of the organization")
      .optional()
      .nullable(),
    sector_id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of the sector")
      .optional()
      .nullable(),
    subsector_id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of the subsector")
      .optional()
      .nullable(),
    size_id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of the organization size")
      .optional()
      .nullable(),
    main_activity_id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of the main activity")
      .optional()
      .nullable(),
    main_activity_quantity: z
      .int()
      .describe("The quantity of the main activity")
      .optional()
      .nullable(),
  })
  .strict();

// Base Carbon Inventory Schema
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

// Create Carbon Inventory Request Schema
export const CreateCarbonInventoryRequestSchema = z
  .object({
    organizationId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .optional()
      .describe("The ID of the organization"),
    organizationBranchId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .optional()
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
    usageMode: UsageModeSchema.describe(
      "The usage mode (simplified or expert)"
    ),
    methodologyVersionId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .optional()
      .describe("The ID of the methodology version"),
    preselectedNodesId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .optional()
      .describe("The ID of the preselected nodes"),
  })
  .strict();

// Response Schemas
export const GetAllCarbonInventoriesResponseSchema = z.array(
  CarbonInventorySchema
);

export const GetCarbonInventoryByIdResponseSchema = CarbonInventorySchema;

export const CreateCarbonInventoryResponseSchema = CarbonInventorySchema;

// TypeScript Types
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>;
export type UsageMode = z.infer<typeof UsageModeSchema>;
export type OrganizationData = z.infer<typeof OrganizationDataSchema>;
export type CarbonInventory = z.infer<typeof CarbonInventorySchema>;
export type CreateCarbonInventoryRequest = z.infer<
  typeof CreateCarbonInventoryRequestSchema
>;
export type GetAllCarbonInventoriesResponse = z.infer<
  typeof GetAllCarbonInventoriesResponseSchema
>;
export type GetCarbonInventoryByIdResponse = z.infer<
  typeof GetCarbonInventoryByIdResponseSchema
>;
export type CreateCarbonInventoryResponse = z.infer<
  typeof CreateCarbonInventoryResponseSchema
>;
