import { z } from "zod";
import type {
  UpdateCountrySectorParamsSchema,
  UpdateCountrySectorRequestSchema,
  UpdateCountrySectorResponseSchema,
} from "./schemas.js";

export type UpdateCountrySectorParams = z.infer<
  typeof UpdateCountrySectorParamsSchema
>;
export type UpdateCountrySectorRequest = z.infer<
  typeof UpdateCountrySectorRequestSchema
>;
export type UpdateCountrySectorResponse = z.infer<
  typeof UpdateCountrySectorResponseSchema
>;
