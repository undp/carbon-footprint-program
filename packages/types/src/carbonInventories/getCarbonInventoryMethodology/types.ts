import { z } from "zod";
import type {
  GetCarbonInventoryMethodologyParamsSchema,
  GetCarbonInventoryMethodologyResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryMethodologyParams = z.infer<
  typeof GetCarbonInventoryMethodologyParamsSchema
>;

export type GetCarbonInventoryMethodologyResponse = z.infer<
  typeof GetCarbonInventoryMethodologyResponseSchema
>;
