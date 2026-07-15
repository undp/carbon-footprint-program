import { useCallback, useMemo } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { useQueryClient } from "@tanstack/react-query";
import type { GetMeResponse, OnboardingKey } from "@repo/types";
import { useCompleteOnboarding, useMe } from "@/api/query";
import { userKeys } from "@/api/query/users/keys";
import {
  ANONYMOUS_REACHABLE_KEYS,
  markLocalCompleted,
  readLocalCompletions,
} from "@/utils/onboardingCompletionStorage";

interface UseOnboardingCompletion {
  /**
   * True once the effective (local ∪ DB) completion state is trustworthy: OIDC
   * finished rehydrating AND, if authenticated, /me resolved. Consumers must NOT
   * decide "not completed" (e.g. fire a hint) before this is true.
   */
  ready: boolean;
  isCompleted: (key: OnboardingKey) => boolean;
  complete: (key: OnboardingKey) => void;
}

/**
 * Unified onboarding-completion state across the three session states:
 * authenticated (DB via GET /users/me — cross-device source of truth),
 * anonymous (localStorage), and the transition (merged into the DB on login by
 * useMergeOnboardingCompletionsOnLogin).
 *
 * Effective completion = union(localStorage, DB). Local is read fresh on each
 * `isCompleted` call so a same-tab write is reflected immediately without a
 * cross-tab reactive store.
 */
export const useOnboardingCompletion = (): UseOnboardingCompletion => {
  const oidc = useOidcAuth();
  const isAuthenticated = oidc.isAuthenticated;
  const meQuery = useMe(isAuthenticated);
  const queryClient = useQueryClient();
  const { mutate: completeOnboarding } = useCompleteOnboarding();

  // Never report "not completed" while auth/`/me` are still settling, so a hint
  // never double-fires (incl. the deep-link-with-valid-session case). When
  // anonymous, /me is disabled, so readiness is just OIDC having rehydrated.
  const ready = !oidc.isLoading && (isAuthenticated ? meQuery.isSuccess : true);

  const dbSet = useMemo(
    () => new Set<OnboardingKey>(meQuery.data?.onboardingsCompleted ?? []),
    [meQuery.data?.onboardingsCompleted]
  );

  const isCompleted = useCallback(
    (key: OnboardingKey): boolean =>
      // Read local fresh each call so a same-tab dismissal is seen instantly.
      readLocalCompletions().has(key) || dbSet.has(key),
    [dbSet]
  );

  const complete = useCallback(
    (key: OnboardingKey): void => {
      // Anonymous-only ledger: localStorage records the completion just for the
      // no-session window. When authenticated, the DB is the source of truth and
      // a local entry would be redundant (and would linger until the next login
      // merge prunes it), so we skip it.
      if (!isAuthenticated) {
        if (ANONYMOUS_REACHABLE_KEYS.has(key)) markLocalCompleted(key);
        // Never POST without a session — that was the silent-401 bug. The local
        // write above already suppresses the hint; login merge syncs it later.
        return;
      }
      // Optimistically add the key to the cached /me so any consumer is
      // suppressed instantly, before the mutation's invalidation refetch lands.
      queryClient.setQueryData<GetMeResponse>(userKeys.me, (prev) =>
        prev && !prev.onboardingsCompleted.includes(key)
          ? {
              ...prev,
              onboardingsCompleted: [...prev.onboardingsCompleted, key],
            }
          : prev
      );
      completeOnboarding(key);
    },
    [isAuthenticated, queryClient, completeOnboarding]
  );

  return { ready, isCompleted, complete };
};
