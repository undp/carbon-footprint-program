import z from "zod";

// Response Schemas
export const CarbonInventoryAvailableYearsSchema = z.array(z.string());

// TypeScript Types
export type CarbonInventoryAvailableYearsResponse = z.infer<
  typeof CarbonInventoryAvailableYearsSchema
>;
