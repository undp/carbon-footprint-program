import { z } from "zod";
import type {
  SubCategorySchema,
  SubCategoryWithUnitsSchema,
} from "./baseSchemas.js";

// TypeScript Types
export type SubCategory = z.infer<typeof SubCategorySchema>;
export type SubCategoryWithUnits = z.infer<typeof SubCategoryWithUnitsSchema>;
