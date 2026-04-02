import { z } from "zod";
import type { DeleteEmissionFactorParamsSchema } from "./schemas.js";

export type DeleteEmissionFactorParams = z.infer<
  typeof DeleteEmissionFactorParamsSchema
>;
