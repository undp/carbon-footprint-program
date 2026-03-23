import { z } from "zod";
import type {
  CopyReductionProjectParamsSchema,
  CopyReductionProjectResponseSchema,
} from "./schemas.js";

export type CopyReductionProjectParams = z.infer<
  typeof CopyReductionProjectParamsSchema
>;

export type CopyReductionProjectResponse = z.infer<
  typeof CopyReductionProjectResponseSchema
>;
