import { z } from "zod";
import type {
  RejectReductionProjectParamsSchema,
  RejectReductionProjectBodySchema,
  RejectReductionProjectResponseSchema,
} from "./schemas.js";

export type RejectReductionProjectParams = z.infer<
  typeof RejectReductionProjectParamsSchema
>;

export type RejectReductionProjectBody = z.infer<
  typeof RejectReductionProjectBodySchema
>;

export type RejectReductionProjectResponse = z.infer<
  typeof RejectReductionProjectResponseSchema
>;
