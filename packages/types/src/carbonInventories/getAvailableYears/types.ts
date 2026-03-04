import { z } from "zod";
import type { CarbonInventoryAvailableYearsSchema } from "./schemas.js";

// TypeScript Types
export type CarbonInventoryAvailableYearsResponse = z.infer<
  typeof CarbonInventoryAvailableYearsSchema
>;
