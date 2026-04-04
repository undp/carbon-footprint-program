import { z } from "zod";
import type {
  GetAllReductionProjectsQuerySchema,
  GetAllReductionProjectsResponseSchema,
} from "./schemas.js";

export type GetAllReductionProjectsQuery = z.infer<
  typeof GetAllReductionProjectsQuerySchema
>;

export type GetAllReductionProjectsResponse = z.infer<
  typeof GetAllReductionProjectsResponseSchema
>;
