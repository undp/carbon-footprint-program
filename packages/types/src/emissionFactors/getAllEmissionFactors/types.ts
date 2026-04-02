import { z } from "zod";
import type {
  GetAllEmissionFactorsQuerySchema,
  GetAllEmissionFactorsResponseSchema,
} from "./schemas.js";

export type GetAllEmissionFactorsQuery = z.infer<
  typeof GetAllEmissionFactorsQuerySchema
>;
export type GetAllEmissionFactorsResponse = z.infer<
  typeof GetAllEmissionFactorsResponseSchema
>;
