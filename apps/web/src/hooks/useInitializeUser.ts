import { useEffect } from "react";

import { useUserStore } from "@/stores/userStore";

import { useMe } from "@/api/query";
import { GetMeResponse } from "@repo/types";
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";

interface Props {
  isAuthenticated: boolean;
}

interface ReturnType {
  user?: GetMeResponse;
  refetchUser: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<GetMeResponse, unknown>>;
  isUserError: boolean;
  userError: unknown;
}

/**
 * Hook to initialize user data on app mount.
 * Fetches user data when authenticated and updates the Zustand store.
 * Clears user data when logged out.
 */
export function useInitializeUser({ isAuthenticated }: Props): ReturnType {
  const { setUser, clear } = useUserStore();
  // Surface useMe's error state so AuthContext can react when OIDC succeeded
  // but the follow-up GET /users/me failed.
  const { data: me, refetch, error, isError } = useMe(isAuthenticated);

  useEffect(() => {
    // Clear user data if not authenticated
    if (!isAuthenticated) {
      clear();
      return;
    }

    if (me) setUser(me);
  }, [isAuthenticated, setUser, clear, me]);

  return {
    user: me,
    refetchUser: refetch,
    isUserError: isError,
    userError: error,
  };
}
