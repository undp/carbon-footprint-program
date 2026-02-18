import { z } from "zod";
import type {
  CreateCategoryRequestSchema,
  CreateCategoryResponseSchema,
} from "./schemas.js";

export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type CreateCategoryResponse = z.infer<
  typeof CreateCategoryResponseSchema
>;
