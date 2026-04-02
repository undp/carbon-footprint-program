import { z } from "zod";
import type {
  ClaimCarbonInventoryParamsSchema,
  ClaimCarbonInventoryResponseSchema,
} from "./schemas.js";

export type ClaimCarbonInventoryParams = z.infer<
  typeof ClaimCarbonInventoryParamsSchema
>;

export type ClaimCarbonInventoryResponse = z.infer<
  typeof ClaimCarbonInventoryResponseSchema
>;
