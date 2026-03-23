import { z } from "zod";
import type {
  CreateReductionProjectBodySchema,
  CreateReductionProjectResponseSchema,
} from "./schemas.js";

export type CreateReductionProjectBody = z.infer<
  typeof CreateReductionProjectBodySchema
>;

export type CreateReductionProjectResponse = z.infer<
  typeof CreateReductionProjectResponseSchema
>;
