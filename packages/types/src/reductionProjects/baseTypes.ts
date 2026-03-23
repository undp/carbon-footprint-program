import { z } from "zod";
import type {
  ReductionProjectSchema,
  ReductionProjectFileSchema,
  ReductionProjectReportSchema,
} from "./baseSchemas.js";

// TypeScript Types
export type ReductionProject = z.infer<typeof ReductionProjectSchema>;

export type ReductionProjectFile = z.infer<typeof ReductionProjectFileSchema>;

export type ReductionProjectReport = z.infer<
  typeof ReductionProjectReportSchema
>;
