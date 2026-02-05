import { z } from "zod";
import type { GetCarbonInventoryByIdResponseSchema } from "./schemas.js";

// TypeScript Types
export type GetCarbonInventoryByIdResponse = z.infer<
  typeof GetCarbonInventoryByIdResponseSchema
>;
