import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useNavigate } from "@tanstack/react-router";
import { loginRequest } from "@/config/msalConfig";
import type { AccountInfo } from "@azure/msal-browser";
import type { GetMeResponse } from "@repo/types";
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";
import { useInitializeUser } from "../hooks/useInitializeUser";
import { enqueueSnackbar } from "notistack";
import { queryClient } from "@/api/query/client";
import { userKeys } from "@/api/query/users/keys";
import { useUserStore } from "@/stores/userStore";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  signInPopup: () => Promise<void>;
  signInRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  user?: GetMeResponse;
  refetchUser: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<GetMeResponse, unknown>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const clearUserStore = useUserStore((state) => state.clear);
  const [isLoading, setIsLoading] = useState(true);

  const account: AccountInfo | null = accounts[0] || null;

  const { user, refetchUser, isUserError } = useInitializeUser({
    isAuthenticated,
    account,
  });

  useEffect(() => {
    // Set loading to false once MSAL finishes initialization
    if (inProgress === "none") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- MSAL lifecycle transition; deriving from inProgress is not viable since we need to flip loading exactly once
      setIsLoading(false);
    }
  }, [inProgress]);

  /**
   * Handles the case where MSAL authentication succeeded but the
   * follow-up GET /users/me request failed. Drops the local MSAL
   * cache (without an Azure round-trip), clears app state, and
   * sends the user back to Landing with an error snackbar.
   */
  // Ref guard: ensures cleanup runs once per login failure even if the
  // effect re-runs while React Query is still in its error state.
  const hasHandledLoginFailureRef = useRef(false);
  const handleLoginFailure = useCallback(async () => {
    if (hasHandledLoginFailureRef.current) return;
    hasHandledLoginFailureRef.current = true;
    // clearCache is isolated: if it fails we still want to clear app
    // state, redirect, and inform the user — otherwise a flaky MSAL
    // call would strand the user in a half-broken session.
    try {
      // clearCache wipes the local MSAL session without redirecting to
      // Azure's logout endpoint, so the in-memory snackbar survives.
      if (account) {
        await instance.clearCache({ account });
      } else {
        await instance.clearCache();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("MSAL clearCache failed during login recovery:", error);
    }
    // Drop the failed /users/me cache entry so the next login attempt
    // refetches instead of replaying the cached error.
    queryClient.removeQueries({ queryKey: userKeys.me });
    clearUserStore();
    await navigate({ to: "/" });
    enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
      variant: "error",
    });
  }, [account, instance, navigate, clearUserStore]);

  // Trigger the cleanup when MSAL is authenticated but /users/me failed.
  // Reset the guard once the user is no longer authenticated so a future
  // login attempt in the same session can be handled again.
  useEffect(() => {
    if (!isAuthenticated) {
      hasHandledLoginFailureRef.current = false;
      return;
    }
    if (isUserError && account) {
      void handleLoginFailure();
    }
  }, [isAuthenticated, isUserError, account, handleLoginFailure]);

  /**
   * Sign in with popup (recommended for SPA)
   */
  const signInPopup = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(response.account);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login popup failed:", error);
      enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  /**
   * Sign in with redirect (alternative)
   */
  const signInRedirect = useCallback(async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login redirect failed:", error);
      enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
        variant: "error",
      });
    }
  }, [instance]);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await instance.logoutRedirect({
        account,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout failed:", error);
      enqueueSnackbar("Ocurrió un problema al cerrar sesión", {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [instance, account]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    account,
    user,
    refetchUser,
    signInPopup,
    signInRedirect,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Provides MSAL authentication state and methods.
 * For user data, use useUser(account?.username) with React Query.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
