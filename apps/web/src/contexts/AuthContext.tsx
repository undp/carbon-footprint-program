import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { useNavigate } from "@tanstack/react-router";
import type { GetMeResponse } from "@repo/types";
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";
import { useInitializeUser } from "../hooks/useInitializeUser";
import { enqueueSnackbar } from "notistack";
import { queryClient } from "@/api/query/client";
import { userKeys } from "@/api/query/users/keys";
import { useUserStore } from "@/stores/userStore";
import { IS_OIDC_CONFIGURED } from "@/config/environment";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
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
  const oidc = useOidcAuth();
  const navigate = useNavigate();
  const clearUserStore = useUserStore((state) => state.clear);

  const isAuthenticated = oidc.isAuthenticated;
  const isLoading = oidc.isLoading;

  const { user, refetchUser, isUserError } = useInitializeUser({
    isAuthenticated,
  });

  // Ref guard: ensures cleanup runs once per login failure even if the effect
  // re-runs while React Query is still in its error state.
  const hasHandledLoginFailureRef = useRef(false);

  /**
   * Handles the case where OIDC authentication succeeded but the follow-up
   * GET /users/me request failed. Drops the local session via removeUser()
   * (no IdP round-trip, so the in-memory snackbar survives), clears app state,
   * and sends the user back to Landing with an error snackbar.
   */
  const handleLoginFailure = useCallback(async () => {
    if (hasHandledLoginFailureRef.current) return;
    hasHandledLoginFailureRef.current = true;
    // removeUser is isolated: if it fails we still clear app state, redirect,
    // and inform the user — otherwise a flaky call would strand the user in a
    // half-broken session.
    try {
      await oidc.removeUser();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("removeUser failed during login recovery:", error);
    }
    // Drop the failed /users/me cache entry so the next login attempt refetches
    // instead of replaying the cached error.
    queryClient.removeQueries({ queryKey: userKeys.me });
    clearUserStore();
    await navigate({ to: "/" });
    enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
      variant: "error",
    });
  }, [oidc, navigate, clearUserStore]);

  // Trigger the cleanup when OIDC is authenticated but /users/me failed. Reset
  // the guard once the user is no longer authenticated so a future login
  // attempt in the same session can be handled again.
  useEffect(() => {
    if (!isAuthenticated) {
      hasHandledLoginFailureRef.current = false;
      return;
    }
    if (isUserError) {
      void handleLoginFailure();
    }
  }, [isAuthenticated, isUserError, handleLoginFailure]);

  /**
   * Sign in with popup. Rejects on failure so callers that continue a pending
   * action after login (e.g. SaveDraftAuthModal) can abort correctly.
   */
  const signInPopup = useCallback(async () => {
    if (!IS_OIDC_CONFIGURED) {
      enqueueSnackbar("El inicio de sesión no está configurado", {
        variant: "error",
      });
      throw new Error(
        "OIDC login is not configured (VITE_OIDC_ISSUER / VITE_OIDC_CLIENT_ID / VITE_OIDC_SCOPES are empty)."
      );
    }
    try {
      await oidc.signinPopup();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login popup failed:", error);
      enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
        variant: "error",
      });
      throw error;
    }
  }, [oidc]);

  /**
   * Sign in with a full-page redirect to the IdP.
   */
  const signInRedirect = useCallback(async () => {
    if (!IS_OIDC_CONFIGURED) {
      enqueueSnackbar("El inicio de sesión no está configurado", {
        variant: "error",
      });
      return;
    }
    try {
      await oidc.signinRedirect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login redirect failed:", error);
      enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
        variant: "error",
      });
    }
  }, [oidc]);

  /**
   * Federated sign out via the IdP's end-session endpoint.
   */
  const signOut = useCallback(async () => {
    try {
      await oidc.signoutRedirect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout failed:", error);
      enqueueSnackbar("Ocurrió un problema al cerrar sesión", {
        variant: "error",
      });
    }
  }, [oidc]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    refetchUser,
    signInPopup,
    signInRedirect,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context.
 * Provides OIDC authentication state and methods.
 * For user data, use the `user` field (GetMeResponse from /users/me).
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
