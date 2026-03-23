import { z } from "zod";
import type {
  GetAllReductionProjectsQuerySchema,
  ReductionProjectSummarySchema,
  GetAllReductionProjectsResponseSchema,
} from "./schemas.js";

export type GetAllReductionProjectsQuery = z.infer<
  typeof GetAllReductionProjectsQuerySchema
>;

export type ReductionProjectSummary = z.infer<
  typeof ReductionProjectSummarySchema
>;

export type GetAllReductionProjectsResponse = z.infer<
  typeof GetAllReductionProjectsResponseSchema
>;
