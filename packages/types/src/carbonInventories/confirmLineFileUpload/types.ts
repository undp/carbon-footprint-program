import { z } from "zod";
import type {
  ConfirmLineFileUploadParamsSchema,
  ConfirmLineFileUploadBodySchema,
  ConfirmLineFileUploadResponseSchema,
} from "./schemas.js";

export type ConfirmLineFileUploadParams = z.infer<
  typeof ConfirmLineFileUploadParamsSchema
>;

export type ConfirmLineFileUploadBody = z.infer<
  typeof ConfirmLineFileUploadBodySchema
>;

export type ConfirmLineFileUploadResponse = z.infer<
  typeof ConfirmLineFileUploadResponseSchema
>;
