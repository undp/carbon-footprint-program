import { z } from "zod";
import type {
  CreateCountrySectorRequestSchema,
  CreateCountrySectorResponseSchema,
} from "./schemas.js";

export type CreateCountrySectorRequest = z.infer<
  typeof CreateCountrySectorRequestSchema
>;
export type CreateCountrySectorResponse = z.infer<
  typeof CreateCountrySectorResponseSchema
>;
