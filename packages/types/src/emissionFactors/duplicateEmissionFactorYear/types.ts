import { z } from "zod";
import type {
  DuplicateEmissionFactorYearChangeSchema,
  DuplicateEmissionFactorYearRequestSchema,
  DuplicateEmissionFactorYearResponseSchema,
  EmissionFactorYearCopyInvalidDetailsSchema,
  EmissionFactorYearCopyViolationSchema,
} from "./schemas.js";

export type DuplicateEmissionFactorYearChange = z.infer<
  typeof DuplicateEmissionFactorYearChangeSchema
>;
export type DuplicateEmissionFactorYearRequest = z.infer<
  typeof DuplicateEmissionFactorYearRequestSchema
>;
export type DuplicateEmissionFactorYearResponse = z.infer<
  typeof DuplicateEmissionFactorYearResponseSchema
>;
export type EmissionFactorYearCopyViolation = z.infer<
  typeof EmissionFactorYearCopyViolationSchema
>;
export type EmissionFactorYearCopyInvalidDetails = z.infer<
  typeof EmissionFactorYearCopyInvalidDetailsSchema
>;
