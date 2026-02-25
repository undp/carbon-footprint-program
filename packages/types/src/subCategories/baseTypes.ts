import { z } from "zod";
import type { SubCategorySchema } from "./baseSchemas.js";

// TypeScript Types
export type SubCategory = z.infer<typeof SubCategorySchema>;
