import { z } from "zod";
import type {
  ReopenReductionProjectParamsSchema,
  ReopenReductionProjectResponseSchema,
} from "./schemas.js";

export type ReopenReductionProjectParams = z.infer<
  typeof ReopenReductionProjectParamsSchema
>;

export type ReopenReductionProjectResponse = z.infer<
  typeof ReopenReductionProjectResponseSchema
>;
