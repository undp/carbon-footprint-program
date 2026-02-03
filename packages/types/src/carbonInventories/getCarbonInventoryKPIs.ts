import { z } from "zod";

// Query schema
export const GetCarbonInventoryKPIsQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/, "Year must be a valid number")
    .optional()
    .describe(
      'Optional year filter. Must be a number (e.g., "2024"). Omit to get all years.'
    ),
});

// Category total schema
export const CategoryTotalSchema = z.object({
  position: z
    .number()
    .int()
    .describe("The position of the category (1, 2, or 3)"),
  name: z
    .string()
    .describe("The name of the category (e.g., Scope 1, Scope 2, Scope 3)"),
  total: z.number().describe("The total emissions for this category"),
});

// Response schema
export const GetCarbonInventoryKPIsResponseSchema = z.object({
  total: z
    .number()
    .describe(
      "The sum of all emissions from non-DRAFT inventories (SUBMITTED and VERIFIED)"
    ),
  categoryTotals: z
    .array(CategoryTotalSchema)
    .describe("The emissions totals grouped by category"),
});

// TypeScript Types
export type GetCarbonInventoryKPIsQuery = z.infer<
  typeof GetCarbonInventoryKPIsQuerySchema
>;
export type CategoryTotal = z.infer<typeof CategoryTotalSchema>;
export type GetCarbonInventoryKPIsResponse = z.infer<
  typeof GetCarbonInventoryKPIsResponseSchema
>;
