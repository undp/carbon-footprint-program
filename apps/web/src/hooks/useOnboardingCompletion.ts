import { useCallback, useMemo } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import type { OnboardingKey } from "@repo/types";
import { useCompleteOnboarding, useMe } from "@/api/query";
import { IS_DEVELOPMENT } from "@/config/environment";
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
  /**
   * True if `key` is completed in the effective (local ∪ DB) state. Reads
   * localStorage fresh on each call, so it is NOT reactive to same-tab local
   * writes: a caller must not expect a re-render after an anonymous `complete()`
   * (today's only consumer dismisses, then relies on its own `hasRunRef` rather
   * than a re-render). A consumer that renders *from* `isCompleted` after an
   * anonymous `complete()` would need its own reactive trigger.
   */
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
        if (ANONYMOUS_REACHABLE_KEYS.has(key)) {
          markLocalCompleted(key);
        } else if (IS_DEVELOPMENT) {
          // Misconfiguration guardrail: an anonymous `complete()` for a key that
          // isn't allow-listed is silently dropped (no local write, no POST), so
          // the hint re-fires on every anonymous load. Surface it in dev so a
          // contributor adding an anonymous-reachable onboarding sees the missing
          // ANONYMOUS_REACHABLE_KEYS entry instead of a silent no-op.
          // eslint-disable-next-line no-console
          console.warn(
            `[onboarding] complete("${key}") was called while anonymous, but the key is not in ANONYMOUS_REACHABLE_KEYS — the dismissal was dropped. If this onboarding is reachable without a session, add its key there.`
          );
        }
        // Never POST without a session — that was the silent-401 bug. The local
        // write above already suppresses the hint; login merge syncs it later.
        return;
      }
      // Authenticated: the DB is the source of truth. useCompleteOnboarding
      // invalidates /me on success, which refreshes the effective completion
      // state — no optimistic cache write needed (by the time this runs the hint
      // is already being dismissed, so there is no same-render flash to hide).
      completeOnboarding(key);
    },
    [isAuthenticated, completeOnboarding]
  );

  return { ready, isCompleted, complete };
};
