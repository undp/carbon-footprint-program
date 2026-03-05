import { z } from "zod";
import type { RequestCalculationParamsSchema } from "./schemas.js";

export type RequestCalculationParams = z.infer<
  typeof RequestCalculationParamsSchema
>;
