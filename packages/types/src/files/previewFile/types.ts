import { z } from "zod";
import type {
  PreviewFileParamsSchema,
  PreviewFileResponseSchema,
} from "./schemas.js";

export type PreviewFileParams = z.infer<typeof PreviewFileParamsSchema>;
export type PreviewFileResponse = z.infer<typeof PreviewFileResponseSchema>;
