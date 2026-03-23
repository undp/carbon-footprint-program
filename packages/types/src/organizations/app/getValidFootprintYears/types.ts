import { z } from "zod";
import type {
  GetValidFootprintYearsParamsSchema,
  GetValidFootprintYearsResponseSchema,
} from "./schemas.js";

export type GetValidFootprintYearsParams = z.infer<
  typeof GetValidFootprintYearsParamsSchema
>;

export type GetValidFootprintYearsResponse = z.infer<
  typeof GetValidFootprintYearsResponseSchema
>;
