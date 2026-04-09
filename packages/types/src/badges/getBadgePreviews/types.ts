import { z } from "zod";
import {
  GetBadgePreviewsResponseSchema,
  GetBadgePreviewsQuerySchema,
} from "./schemas.js";

export type GetBadgePreviewsResponse = z.infer<
  typeof GetBadgePreviewsResponseSchema
>;

export type GetBadgePreviewsQuery = z.infer<typeof GetBadgePreviewsQuerySchema>;
