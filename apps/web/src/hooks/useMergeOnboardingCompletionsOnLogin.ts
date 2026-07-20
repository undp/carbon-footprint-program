import { useEffect, useRef } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { useQueryClient } from "@tanstack/react-query";
import type { OnboardingKey } from "@repo/types";
import { apiClient } from "@/api/http";
import { onboardingCompletePath, useMe } from "@/api/query";
import { userKeys } from "@/api/query/users/keys";
import {
  clearLocalKeys,
  readLocalCompletions,
} from "@/utils/onboardingCompletionStorage";

/**
 * On login, merges anonymous-window completions (localStorage) into the DB, then
 * prunes every local key now confirmed in the DB. Mounted once in AuthProvider —
 * the single owner of the auth + /me lifecycle.
 *
 * There is deliberately NO session-end / logout / expiry handling: pruning is
 * tied to a successful merge, not to session teardown, so session expiry is
 * irrelevant to the cleanup. A key whose POST fails stays in localStorage and is
 * retried on the next login.
 */
export const useMergeOnboardingCompletionsOnLogin = (): void => {
  const oidc = useOidcAuth();
  const isAuthenticated = oidc.isAuthenticated;
  const meQuery = useMe(isAuthenticated);
  const queryClient = useQueryClient();
  const hasMergedRef = useRef(false);

  useEffect(() => {
    // Reset defensively so a re-login in the same tab merges again.
    if (!isAuthenticated) {
      hasMergedRef.current = false;
      return;
    }
    if (hasMergedRef.current || !meQuery.isSuccess) return;
    hasMergedRef.current = true;

    const dbSet = new Set<OnboardingKey>(
      meQuery.data?.onboardingsCompleted ?? []
    );
    const local = [...readLocalCompletions()];
    // Keys already in the DB can be pruned immediately.
    const confirmedInDb = local.filter((key) => dbSet.has(key));
    // Keys the anonymous session recorded that the DB doesn't have yet.
    const toPush = local.filter((key) => !dbSet.has(key));

    if (toPush.length === 0) {
      clearLocalKeys(confirmedInDb);
      return;
    }

    void (async () => {
      // Idempotent singular POST per key (diff ≤ 2 today; no batch endpoint by
      // design), via the same path builder as useCompleteOnboarding so the two
      // requests can't drift; one invalidation after.
      const results = await Promise.allSettled(
        toPush.map((key) => apiClient.post(onboardingCompletePath(key)))
      );
      await queryClient.invalidateQueries({ queryKey: userKeys.me });
      // Prune only keys now confirmed in the DB: those already there plus those
      // whose POST resolved. Failed pushes stay local and retry next login.
      const pushed = toPush.filter(
        (_, index) => results[index].status === "fulfilled"
      );
      clearLocalKeys([...confirmedInDb, ...pushed]);
    })();
  }, [
    isAuthenticated,
    meQuery.isSuccess,
    meQuery.data?.onboardingsCompleted,
    queryClient,
  ]);
};
