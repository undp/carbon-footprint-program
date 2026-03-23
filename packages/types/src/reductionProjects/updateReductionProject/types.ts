import { z } from "zod";
import type {
  UpdateReductionProjectParamsSchema,
  UpdateReductionProjectBodySchema,
  UpdateReductionProjectResponseSchema,
} from "./schemas.js";

export type UpdateReductionProjectParams = z.infer<
  typeof UpdateReductionProjectParamsSchema
>;

export type UpdateReductionProjectBody = z.infer<
  typeof UpdateReductionProjectBodySchema
>;

export type UpdateReductionProjectResponse = z.infer<
  typeof UpdateReductionProjectResponseSchema
>;
