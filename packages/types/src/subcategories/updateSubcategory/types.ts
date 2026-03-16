import { z } from "zod";
import type {
  UpdateSubcategoryParamsSchema,
  UpdateSubcategoryRequestSchema,
  UpdateSubcategoryResponseSchema,
} from "./schemas.js";

export type UpdateSubcategoryParams = z.infer<
  typeof UpdateSubcategoryParamsSchema
>;
export type UpdateSubcategoryRequest = z.infer<
  typeof UpdateSubcategoryRequestSchema
>;
export type UpdateSubcategoryResponse = z.infer<
  typeof UpdateSubcategoryResponseSchema
>;
