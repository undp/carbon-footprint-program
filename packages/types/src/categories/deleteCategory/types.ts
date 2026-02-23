import { z } from "zod";
import type {
  DeleteCategoryParamsSchema,
  DeleteCategoryResponseSchema,
} from "./schemas.js";

export type DeleteCategoryParams = z.infer<typeof DeleteCategoryParamsSchema>;
export type DeleteCategoryResponse = z.infer<
  typeof DeleteCategoryResponseSchema
>;
