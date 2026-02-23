import { z } from "zod";
import type {
  BadgeRequestUploadBodySchema,
  BadgeRequestUploadResponseSchema,
  BadgeConfirmUploadBodySchema,
  BadgeConfirmUploadResponseSchema,
  BadgeGetFilesQuerySchema,
  BadgeGetFilesResponseSchema,
} from "./schemas.ts";

export type BadgeRequestUploadBody = z.infer<
  typeof BadgeRequestUploadBodySchema
>;
export type BadgeRequestUploadResponse = z.infer<
  typeof BadgeRequestUploadResponseSchema
>;
export type BadgeConfirmUploadBody = z.infer<
  typeof BadgeConfirmUploadBodySchema
>;
export type BadgeConfirmUploadResponse = z.infer<
  typeof BadgeConfirmUploadResponseSchema
>;
export type BadgeGetFilesQuery = z.infer<typeof BadgeGetFilesQuerySchema>;
export type BadgeGetFilesResponse = z.infer<typeof BadgeGetFilesResponseSchema>;
