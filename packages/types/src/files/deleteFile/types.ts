import { z } from "zod";
import type {
  DeleteFileParamsSchema,
  DeleteFileResponseSchema,
} from "./schemas.js";

export type DeleteFileParams = z.infer<typeof DeleteFileParamsSchema>;
export type DeleteFileResponse = z.infer<typeof DeleteFileResponseSchema>;
