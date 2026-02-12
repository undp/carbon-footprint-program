import { z } from "zod";
import type {
  MethodologyCountrySchema,
  MethodologySchema,
  MethodologyWithCountsSchema,
} from "./baseSchemas.js";

// TypeScript Types
export type MethodologyCountry = z.infer<typeof MethodologyCountrySchema>;
export type Methodology = z.infer<typeof MethodologySchema>;
export type MethodologyWithRelations = z.infer<
  typeof MethodologyWithCountsSchema
>;
