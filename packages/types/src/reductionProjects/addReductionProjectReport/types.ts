import { z } from "zod";
import type {
  AddReductionProjectReportParamsSchema,
  AddReductionProjectReportBodySchema,
  AddReductionProjectReportResponseSchema,
} from "./schemas.js";

export type AddReductionProjectReportParams = z.infer<
  typeof AddReductionProjectReportParamsSchema
>;

export type AddReductionProjectReportBody = z.infer<
  typeof AddReductionProjectReportBodySchema
>;

export type AddReductionProjectReportResponse = z.infer<
  typeof AddReductionProjectReportResponseSchema
>;
