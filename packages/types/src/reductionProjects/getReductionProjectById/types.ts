import { z } from "zod";
import type {
  GetReductionProjectByIdParamsSchema,
  GetReductionProjectByIdResponseSchema,
} from "./schemas.js";

export type GetReductionProjectByIdParams = z.infer<
  typeof GetReductionProjectByIdParamsSchema
>;

export type GetReductionProjectByIdResponse = z.infer<
  typeof GetReductionProjectByIdResponseSchema
>;
