import { z } from "zod";

// Query schema
export const GetCarbonInventoryKPIsQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .describe('Optional year filter. Use "all" for all years, a specific year (e.g., "2024"), or omit for all years'),
});

// Category total schema
export const CategoryTotalSchema = z.object({
  categoryPosition: z.number().int().describe("The position of the category (1, 2, or 3)"),
  categoryName: z.string().describe("The name of the category (e.g., Scope 1, Scope 2, Scope 3)"),
  total: z.number().describe("The total emissions for this category"),
});

// Response schema
export const GetCarbonInventoryKPIsResponseSchema = z.object({
  total: z.number().describe("The sum of all emissions from VERIFIED inventories"),
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
