import { z } from "zod";
import type {
  SyncCreateLineItemSchema,
  SyncUpdateLineItemSchema,
  SyncDeleteLineItemSchema,
  SyncCarbonInventoryLinesRequestSchema,
  SyncCarbonInventoryLinesResponseSchema,
  SyncCarbonInventoryLinesParamsSchema,
} from "./schemas.js";

// TypeScript types
export type SyncCreateLineItem = z.infer<typeof SyncCreateLineItemSchema>;

export type SyncUpdateLineItem = z.infer<typeof SyncUpdateLineItemSchema>;

export type SyncDeleteLineItem = z.infer<typeof SyncDeleteLineItemSchema>;

export type SyncCarbonInventoryLinesRequest = z.infer<
  typeof SyncCarbonInventoryLinesRequestSchema
>;

export type SyncCarbonInventoryLinesResponse = z.infer<
  typeof SyncCarbonInventoryLinesResponseSchema
>;

export type SyncCarbonInventoryLinesParams = z.infer<
  typeof SyncCarbonInventoryLinesParamsSchema
>;
