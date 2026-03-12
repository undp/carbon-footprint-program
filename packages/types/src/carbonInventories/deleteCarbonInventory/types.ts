import { z } from "zod";
import type {
  DeleteCarbonInventoryParamsSchema,
  DeleteCarbonInventoryResponseSchema,
} from "./schemas.js";

export type DeleteCarbonInventoryParams = z.infer<
  typeof DeleteCarbonInventoryParamsSchema
>;

export type DeleteCarbonInventoryResponse = z.infer<
  typeof DeleteCarbonInventoryResponseSchema
>;
