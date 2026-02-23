import { z } from "zod";
import type {
  CarbonInventoryLineSchema,
  CarbonInventorySchema,
  OrganizationDataSchema,
} from "./baseSchemas.js";

// TypeScript Types
export type OrganizationData = z.infer<typeof OrganizationDataSchema>;

export type CarbonInventory = z.infer<typeof CarbonInventorySchema>;

export type CarbonInventoryLine = z.infer<typeof CarbonInventoryLineSchema>;
