import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/config/msalConfig";
import type { AccountInfo } from "@azure/msal-browser";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  signInPopup: () => Promise<void>;
  signInRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);

  const account: AccountInfo | null = accounts[0] || null;

  useEffect(() => {
    // Set loading to false once MSAL finishes initialization
    if (inProgress === "none") {
      setIsLoading(false);
    }
  }, [inProgress]);

  /**
   * Sign in with popup (recommended for SPA)
   */
  const signInPopup = async () => {
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
  };

  /**
   * Sign in with redirect (alternative)
   */
  const signInRedirect = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login redirect failed:", error);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
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
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    account,
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
