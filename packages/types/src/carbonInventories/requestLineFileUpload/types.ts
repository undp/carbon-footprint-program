import { z } from "zod";
import type {
  RequestLineFileUploadParamsSchema,
  RequestLineFileUploadBodySchema,
  RequestLineFileUploadResponseSchema,
} from "./schemas.js";

export type RequestLineFileUploadParams = z.infer<
  typeof RequestLineFileUploadParamsSchema
>;

export type RequestLineFileUploadBody = z.infer<
  typeof RequestLineFileUploadBodySchema
>;

export type RequestLineFileUploadResponse = z.infer<
  typeof RequestLineFileUploadResponseSchema
>;
