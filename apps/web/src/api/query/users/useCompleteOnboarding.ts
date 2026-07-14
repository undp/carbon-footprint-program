import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/api/http";
import type { OnboardingKey } from "@repo/types";
import { userKeys } from "./keys";

/**
 * Marks an onboarding as finished/dismissed for the current user. Idempotent —
 * the void response is awaited without `.json()` (empty body). Refreshes the
 * cached `me` so the home gate reacts immediately.
 */
export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, OnboardingKey>({
    mutationFn: async (key) => {
      await apiClient.post(`users/me/onboardings/${key}/complete`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.me }),
  });
};
