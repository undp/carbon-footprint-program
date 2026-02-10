import type { z } from "zod";
import type { GetEmissionFactorsResponseSchema } from "./schemas.js";

export type GetEmissionFactorsResponse = z.infer<
  typeof GetEmissionFactorsResponseSchema
>;
