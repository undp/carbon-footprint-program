import { z } from "zod";
import type {
  SubmitReductionProjectParamsSchema,
  SubmitReductionProjectResponseSchema,
} from "./schemas.js";

export type SubmitReductionProjectParams = z.infer<
  typeof SubmitReductionProjectParamsSchema
>;

export type SubmitReductionProjectResponse = z.infer<
  typeof SubmitReductionProjectResponseSchema
>;
