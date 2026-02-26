import { z } from "zod";
import type {
  CreateSubcategoryRequestSchema,
  CreateSubcategoryResponseSchema,
} from "./schemas.js";

export type CreateSubcategoryRequest = z.infer<
  typeof CreateSubcategoryRequestSchema
>;
export type CreateSubcategoryResponse = z.infer<
  typeof CreateSubcategoryResponseSchema
>;
