import { z } from "zod";
import type {
  DownloadFileParamsSchema,
  DownloadFileResponseSchema,
} from "./schemas.js";

export type DownloadFileParams = z.infer<typeof DownloadFileParamsSchema>;
export type DownloadFileResponse = z.infer<typeof DownloadFileResponseSchema>;
