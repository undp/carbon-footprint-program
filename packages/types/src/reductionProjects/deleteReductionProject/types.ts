import { z } from "zod";
import type {
  DeleteReductionProjectParamsSchema,
  DeleteReductionProjectResponseSchema,
} from "./schemas.js";

export type DeleteReductionProjectParams = z.infer<
  typeof DeleteReductionProjectParamsSchema
>;

export type DeleteReductionProjectResponse = z.infer<
  typeof DeleteReductionProjectResponseSchema
>;
