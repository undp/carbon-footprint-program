import { z } from "zod";
import type {
  GetReductionProjectsMinimalParamsSchema,
  GetReductionProjectsMinimalResponseSchema,
} from "./schemas.js";

export type GetReductionProjectsMinimalParams = z.infer<
  typeof GetReductionProjectsMinimalParamsSchema
>;

export type GetReductionProjectsMinimalResponse = z.infer<
  typeof GetReductionProjectsMinimalResponseSchema
>;
