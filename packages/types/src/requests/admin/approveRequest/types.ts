import { z } from "zod";
import {
  ApproveRequestParamsSchema,
  ApproveRequestBodySchema,
  ApproveRequestResponseSchema,
} from "./schemas.js";

export type ApproveRequestParams = z.infer<typeof ApproveRequestParamsSchema>;
export type ApproveRequestBody = z.infer<typeof ApproveRequestBodySchema>;
export type ApproveRequestResponse = z.infer<
  typeof ApproveRequestResponseSchema
>;
