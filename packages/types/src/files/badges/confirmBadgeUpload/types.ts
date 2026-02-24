import { z } from "zod";
import type {
  ConfirmBadgeUploadParamsSchema,
  ConfirmBadgeUploadBodySchema,
  ConfirmBadgeUploadResponseSchema,
} from "./schemas.js";

export type ConfirmBadgeUploadParams = z.infer<
  typeof ConfirmBadgeUploadParamsSchema
>;

export type ConfirmBadgeUploadBody = z.infer<
  typeof ConfirmBadgeUploadBodySchema
>;
export type ConfirmBadgeUploadResponse = z.infer<
  typeof ConfirmBadgeUploadResponseSchema
>;
