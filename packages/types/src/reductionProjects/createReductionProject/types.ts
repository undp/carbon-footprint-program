import { z } from "zod";
import type {
  CreateReductionProjectRequestSchema,
  CreateReductionProjectResponseSchema,
} from "./schemas.js";

export type CreateReductionProjectRequest = z.infer<
  typeof CreateReductionProjectRequestSchema
>;

export type CreateReductionProjectResponse = z.infer<
  typeof CreateReductionProjectResponseSchema
>;
