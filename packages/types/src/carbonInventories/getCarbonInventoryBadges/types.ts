import { z } from "zod";
import type {
  GetCarbonInventoryBadgesParamsSchema,
  GetCarbonInventoryBadgesResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryBadgesParams = z.infer<
  typeof GetCarbonInventoryBadgesParamsSchema
>;

export type GetCarbonInventoryBadgesResponse = z.infer<
  typeof GetCarbonInventoryBadgesResponseSchema
>;
