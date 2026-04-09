import { z } from "zod";
import {
  GetCarbonInventoryHistoryParamsSchema,
  GetCarbonInventoryHistoryResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryHistoryParams = z.infer<
  typeof GetCarbonInventoryHistoryParamsSchema
>;

export type GetCarbonInventoryHistoryResponse = z.infer<
  typeof GetCarbonInventoryHistoryResponseSchema
>;
