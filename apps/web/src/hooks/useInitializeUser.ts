import { useEffect } from "react";

import { useUserStore } from "@/stores/userStore";

import { useMe } from "@/api/query";
import { AccountInfo } from "@azure/msal-browser";
import { GetMeResponse } from "../../../../packages/types/src/users";
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";

interface Props {
  isAuthenticated: boolean;
  account: AccountInfo | null;
}

interface ReturnType {
  user?: GetMeResponse;
  refetchUser: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<GetMeResponse, unknown>>;
}

/**
 * Hook to initialize user data on app mount
 * Fetches user data when authenticated and updates the Zustand store
 * Clears user data when logged out
 *
 */
export function useInitializeUser({
  isAuthenticated,
  account,
}: Props): ReturnType {
  const { setUser, setLoading, setError, clear } = useUserStore();
  const { data: me, refetch } = useMe(isAuthenticated);

  useEffect(() => {
    // Clear user data if not authenticated
    if (!isAuthenticated || !account) {
      clear();
      return;
    }

    // Fetch user data from API
    const fetchUser = () => {
      setLoading(true);
      try {
        if (me) {
          setUser(me);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch user:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUser();
  }, [isAuthenticated, account, setUser, setLoading, setError, clear, me]);

  return { user: me, refetchUser: refetch };
}
