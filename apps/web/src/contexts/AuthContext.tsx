import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/config/msalConfig";
import type { AccountInfo } from "@azure/msal-browser";
import { useUserStore } from "../stores/userStore";
import { useMe } from "../api/query";
import { GetMeResponse } from "@repo/types";
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";
import { useInitializeUser } from "../hooks/useInitializeUser";

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
  const [isLoading, setIsLoading] = useState(true);

  const account: AccountInfo | null = accounts[0] || null;

  const { user, refetchUser } = useInitializeUser({
    isAuthenticated,
    account,
  });

  useEffect(() => {
    // Set loading to false once MSAL finishes initialization
    if (inProgress === "none") {
      setIsLoading(false);
    }
  }, [inProgress]);

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
      throw error;
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
      throw error;
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
      throw error;
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
