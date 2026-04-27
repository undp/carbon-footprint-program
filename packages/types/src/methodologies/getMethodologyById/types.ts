import { z } from "zod";
import {
  GetMethodologyByIdParamsSchema,
  GetMethodologyByIdResponseSchema,
} from "./schemas.js";

export type GetMethodologyByIdParams = z.infer<
  typeof GetMethodologyByIdParamsSchema
>;
export type GetMethodologyByIdResponse = z.infer<
  typeof GetMethodologyByIdResponseSchema
>;
