import { z } from "zod";
import type {
  GetEmissionFactorYearsParamsSchema,
  GetEmissionFactorYearsResponseSchema,
} from "./schemas.js";

export type GetEmissionFactorYearsParams = z.infer<
  typeof GetEmissionFactorYearsParamsSchema
>;

export type GetEmissionFactorYearsResponse = z.infer<
  typeof GetEmissionFactorYearsResponseSchema
>;
