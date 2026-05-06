import type { z } from "zod";
import type {
  GetCarbonInventoryAccessParamsSchema,
  GetCarbonInventoryAccessResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryAccessParams = z.infer<
  typeof GetCarbonInventoryAccessParamsSchema
>;

export type GetCarbonInventoryAccessResponse = z.infer<
  typeof GetCarbonInventoryAccessResponseSchema
>;
