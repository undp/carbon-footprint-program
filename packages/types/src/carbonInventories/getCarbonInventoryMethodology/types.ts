import { z } from "zod";
import type { GetCarbonInventoryMethodologyResponseSchema } from "./schemas.js";

export type GetCarbonInventoryMethodologyResponse = z.infer<
  typeof GetCarbonInventoryMethodologyResponseSchema
>;
