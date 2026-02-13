import { z } from "zod";
import type {
  UpdateCategoryParamsSchema,
  UpdateCategoryRequestSchema,
  UpdateCategoryResponseSchema,
} from "./schemas.js";

export type UpdateCategoryParams = z.infer<typeof UpdateCategoryParamsSchema>;
export type UpdateCategoryRequest = z.infer<
  typeof UpdateCategoryRequestSchema
>;
export type UpdateCategoryResponse = z.infer<
  typeof UpdateCategoryResponseSchema
>;
