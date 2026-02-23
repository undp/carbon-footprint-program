import type { z } from "zod";
import type { GetCarbonInventoryMetadataResponseSchema } from "./schemas.js";

export type GetCarbonInventoryMetadataResponse = z.infer<
  typeof GetCarbonInventoryMetadataResponseSchema
>;
