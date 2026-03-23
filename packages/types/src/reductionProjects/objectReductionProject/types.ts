import { z } from "zod";
import type {
  ObjectReductionProjectParamsSchema,
  ObjectReductionProjectResponseSchema,
} from "./schemas.js";

export type ObjectReductionProjectParams = z.infer<
  typeof ObjectReductionProjectParamsSchema
>;

export type ObjectReductionProjectResponse = z.infer<
  typeof ObjectReductionProjectResponseSchema
>;
