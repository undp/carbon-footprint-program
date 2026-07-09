import { z } from "zod";
import {
  GetMethodologyExportParamsSchema,
  GetMethodologyExportResponseSchema,
} from "./schemas.js";

export type GetMethodologyExportParams = z.infer<
  typeof GetMethodologyExportParamsSchema
>;
export type GetMethodologyExportResponse = z.infer<
  typeof GetMethodologyExportResponseSchema
>;
