import { z } from "zod";
import type {
  CreateSubcategoryRequestSchema,
  CreateSubcategoryResponseSchema,
  SubcategoryFormSchema,
} from "./schemas.js";

export type CreateSubcategoryRequest = z.infer<
  typeof CreateSubcategoryRequestSchema
>;
export type CreateSubcategoryResponse = z.infer<
  typeof CreateSubcategoryResponseSchema
>;
export type SubcategoryForm = z.infer<typeof SubcategoryFormSchema>;
