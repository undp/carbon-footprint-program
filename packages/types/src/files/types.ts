import { z } from "zod";
import { RouteFileTypeSchema } from "../baseSchemas/file.js";
import { PresignedUploadResponseSchema } from "./schemas.js";

export const FileType = RouteFileTypeSchema.enum;

export type FileType = z.infer<typeof RouteFileTypeSchema>;

export type PresignedUploadResponse = z.infer<
  typeof PresignedUploadResponseSchema
>;
