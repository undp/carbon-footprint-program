import { z } from "zod";

/**
 * App-owned identifiers for the guided onboardings a user can finish or dismiss
 * ("don't show me this again"). Kept as a code-level enum on purpose — NOT a
 * database enum — so introducing an onboarding for a new screen is a one-line
 * code change with no migration. Persisted verbatim in
 * `user_onboarding_completion.onboarding_key`, so values are permanent: add new
 * ones, never rename or recycle.
 */
export const OnboardingKeySchema = z.enum([
  "welcome-home",
  "emission-capture:expert-mode",
]);

export type OnboardingKey = z.infer<typeof OnboardingKeySchema>;

/** Named accessors so consumers reference a key by name, not a bare string. */
export const OnboardingKeys = {
  WELCOME_HOME: "welcome-home",
  EMISSION_CAPTURE_EXPERT_MODE: "emission-capture:expert-mode",
} as const satisfies Record<string, OnboardingKey>;
