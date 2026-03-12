import type { z } from "zod";
import type {
  GetEmissionFactorsParamsSchema,
  GetEmissionFactorsResponseSchema,
} from "./schemas.js";

export type GetEmissionFactorsParams = z.infer<
  typeof GetEmissionFactorsParamsSchema
>;

export type GetEmissionFactorsResponse = z.infer<
  typeof GetEmissionFactorsResponseSchema
>;
