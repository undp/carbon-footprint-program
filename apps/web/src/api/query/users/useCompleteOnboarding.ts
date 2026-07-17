import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/api/http";
import type { OnboardingKey } from "@repo/types";
import { userKeys } from "./keys";

/**
 * Path for the "complete onboarding" endpoint. Exported so the login-time merge
 * (useMergeOnboardingCompletionsOnLogin) hits the exact same route instead of
 * re-spelling it.
 */
export const onboardingCompletePath = (key: OnboardingKey): string =>
  `users/me/onboardings/${key}/complete`;

/**
 * Marks an onboarding as finished/dismissed for the current user. Idempotent —
 * the void response is awaited without `.json()` (empty body). Refreshes the
 * cached `me` so the home gate reacts immediately.
 */
export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, OnboardingKey>({
    mutationFn: async (key) => {
      await apiClient.post(onboardingCompletePath(key));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.me }),
  });
};
