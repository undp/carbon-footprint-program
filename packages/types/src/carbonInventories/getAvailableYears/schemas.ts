import { z } from "zod";

// Response Schemas
export const CarbonInventoryAvailableYearsSchema = z.array(
  z.string().regex(/^\d{4}$/, "Year must be a 4-digit string")
);
