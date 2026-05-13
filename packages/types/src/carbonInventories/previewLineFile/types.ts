import { z } from "zod";
import type {
  PreviewLineFileParamsSchema,
  PreviewLineFileResponseSchema,
} from "./schemas.js";

export type PreviewLineFileParams = z.infer<typeof PreviewLineFileParamsSchema>;

export type PreviewLineFileResponse = z.infer<
  typeof PreviewLineFileResponseSchema
>;
