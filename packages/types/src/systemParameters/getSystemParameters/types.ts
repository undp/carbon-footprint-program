import { z } from "zod";
import type {
  GetSystemParametersQuerySchema,
  GetSystemParametersResponseSchema,
} from "./schemas.js";

export type GetSystemParametersQuery = z.infer<
  typeof GetSystemParametersQuerySchema
>;
export type GetSystemParametersResponse = z.infer<
  typeof GetSystemParametersResponseSchema
>;
