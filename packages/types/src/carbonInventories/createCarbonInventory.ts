import { z } from "zod";
import {
  OrganizationDataSchema,
  CarbonInventorySchema,
  UsageModeSchema,
} from "./base.js";

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
    organizationData: OrganizationDataSchema.nullable()
      .optional()
      .describe("Organization data as JSON object"),
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

export const CreateCarbonInventoryResponseSchema = CarbonInventorySchema;

// TypeScript Types
export type CreateCarbonInventoryRequest = z.infer<
  typeof CreateCarbonInventoryRequestSchema
>;

export type CreateCarbonInventoryResponse = z.infer<
  typeof CreateCarbonInventoryResponseSchema
>;
