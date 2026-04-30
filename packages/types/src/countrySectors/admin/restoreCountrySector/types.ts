import { z } from "zod";
import type {
  RestoreCountrySectorParamsSchema,
  RestoreCountrySectorResponseSchema,
} from "./schemas.js";

export type RestoreCountrySectorParams = z.infer<
  typeof RestoreCountrySectorParamsSchema
>;
export type RestoreCountrySectorResponse = z.infer<
  typeof RestoreCountrySectorResponseSchema
>;
