import { z } from "zod";
import type {
  GetExplanationByIdParamsSchema,
  GetExplanationByIdResponseSchema,
} from "./schemas.ts";

export type GetExplanationByIdParams = z.infer<
  typeof GetExplanationByIdParamsSchema
>;

export type GetExplanationByIdResponse = z.infer<
  typeof GetExplanationByIdResponseSchema
>;
