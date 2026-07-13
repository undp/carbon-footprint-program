import { z } from "zod";
import { OnboardingKeySchema } from "../../baseSchemas/index.js";

export const CompleteOnboardingParamsSchema = z.object({
  key: OnboardingKeySchema.describe("The onboarding to mark as completed"),
});

export const CompleteOnboardingResponseSchema = z
  .null()
  .describe("Onboarding marked as completed");
