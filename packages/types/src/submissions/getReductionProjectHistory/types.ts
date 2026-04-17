import { z } from "zod";
import {
  GetReductionProjectHistoryParamsSchema,
  GetReductionProjectHistoryResponseSchema,
} from "./schemas.js";

export type GetReductionProjectHistoryParams = z.infer<
  typeof GetReductionProjectHistoryParamsSchema
>;

export type GetReductionProjectHistoryResponse = z.infer<
  typeof GetReductionProjectHistoryResponseSchema
>;
