import { z } from "zod";
import type {
  CompleteOnboardingParamsSchema,
  CompleteOnboardingResponseSchema,
} from "./schemas.ts";

export type CompleteOnboardingParams = z.infer<
  typeof CompleteOnboardingParamsSchema
>;

export type CompleteOnboardingResponse = z.infer<
  typeof CompleteOnboardingResponseSchema
>;
