import { z } from "zod";
import type {
  ApproveReductionProjectParamsSchema,
  ApproveReductionProjectResponseSchema,
} from "./schemas.js";

export type ApproveReductionProjectParams = z.infer<
  typeof ApproveReductionProjectParamsSchema
>;

export type ApproveReductionProjectResponse = z.infer<
  typeof ApproveReductionProjectResponseSchema
>;
