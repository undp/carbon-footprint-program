import { z } from "zod";
import type {
  UpdateReductionProjectParamsSchema,
  UpdateReductionProjectRequestSchema,
  UpdateReductionProjectResponseSchema,
} from "./schemas.js";

export type UpdateReductionProjectParams = z.infer<
  typeof UpdateReductionProjectParamsSchema
>;

export type UpdateReductionProjectRequest = z.infer<
  typeof UpdateReductionProjectRequestSchema
>;

export type UpdateReductionProjectResponse = z.infer<
  typeof UpdateReductionProjectResponseSchema
>;
