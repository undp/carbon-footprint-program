import { z } from "zod";
import {
  RequestBadgeUploadBodySchema,
  RequestBadgeUploadParamsSchema,
  RequestBadgeUploadResponseSchema,
} from "./schemas.js";

export type RequestBadgeUploadParams = z.infer<
  typeof RequestBadgeUploadParamsSchema
>;

export type RequestBadgeUploadBody = z.infer<
  typeof RequestBadgeUploadBodySchema
>;
export type RequestBadgeUploadResponse = z.infer<
  typeof RequestBadgeUploadResponseSchema
>;
