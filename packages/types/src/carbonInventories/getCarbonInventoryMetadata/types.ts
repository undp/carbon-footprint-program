import type { z } from "zod";
import type {
  GetCarbonInventoryMetadataParamsSchema,
  GetCarbonInventoryMetadataResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryMetadataParams = z.infer<
  typeof GetCarbonInventoryMetadataParamsSchema
>;

export type GetCarbonInventoryMetadataResponse = z.infer<
  typeof GetCarbonInventoryMetadataResponseSchema
>;
