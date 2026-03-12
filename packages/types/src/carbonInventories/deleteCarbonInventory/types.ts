import { z } from "zod";
import type { DeleteCarbonInventoryParamsSchema } from "./schemas.js";

export type DeleteCarbonInventoryParams = z.infer<
  typeof DeleteCarbonInventoryParamsSchema
>;
