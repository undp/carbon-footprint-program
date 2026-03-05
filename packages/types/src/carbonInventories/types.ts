import type { z } from "zod";
import type { CarbonInventoryDisplayStatusSchema } from "./schemas.js";

export type CarbonInventoryDisplayStatus = z.infer<
  typeof CarbonInventoryDisplayStatusSchema
>;
