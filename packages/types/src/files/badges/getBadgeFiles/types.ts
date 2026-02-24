import { z } from "zod";
import type {
  GetBadgeFilesParamsSchema,
  GetBadgeFilesQuerySchema,
  GetBadgeFilesResponseSchema,
} from "./schemas.js";

export type GetBadgeFilesQuery = z.infer<typeof GetBadgeFilesQuerySchema>;
export type GetBadgeFilesParams = z.infer<typeof GetBadgeFilesParamsSchema>;
export type GetBadgeFilesResponse = z.infer<typeof GetBadgeFilesResponseSchema>;
