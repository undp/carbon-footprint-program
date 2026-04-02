import { z } from "zod";
import type { DeleteEmissionFactorDimensionParamsSchema } from "./schemas.js";

export type DeleteEmissionFactorDimensionParams = z.infer<
  typeof DeleteEmissionFactorDimensionParamsSchema
>;
