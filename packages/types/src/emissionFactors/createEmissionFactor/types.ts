import { z } from "zod";
import type {
  CreateEmissionFactorRequestSchema,
  CreateEmissionFactorResponseSchema,
  EmissionFactorFormSchema,
} from "./schemas.js";

export type CreateEmissionFactorRequest = z.infer<
  typeof CreateEmissionFactorRequestSchema
>;
export type CreateEmissionFactorResponse = z.infer<
  typeof CreateEmissionFactorResponseSchema
>;
export type EmissionFactorForm = z.infer<typeof EmissionFactorFormSchema>;
