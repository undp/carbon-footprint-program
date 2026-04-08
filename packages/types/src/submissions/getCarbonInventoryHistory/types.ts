import { z } from "zod";
import { GetCarbonInventoryHistoryParamsSchema } from "./schemas.js";

export type GetCarbonInventoryHistoryParams = z.infer<
  typeof GetCarbonInventoryHistoryParamsSchema
>;
