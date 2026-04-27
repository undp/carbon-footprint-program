import { z } from "zod";
import type {
  DeleteCountrySectorParamsSchema,
  DeleteCountrySectorResponseSchema,
} from "./schemas.js";

export type DeleteCountrySectorParams = z.infer<
  typeof DeleteCountrySectorParamsSchema
>;
export type DeleteCountrySectorResponse = z.infer<
  typeof DeleteCountrySectorResponseSchema
>;
