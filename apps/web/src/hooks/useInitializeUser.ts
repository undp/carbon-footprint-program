import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/userStore";
import { apiClient } from "@/api/http";
import type { GetMeResponse } from "@repo/types";

/**
 * Hook to initialize user data on app mount
 * Fetches user data when authenticated and updates the Zustand store
 * Clears user data when logged out
 *
 * Call this once at the app root level
 */
export function useInitializeUser() {
  const { isAuthenticated, account } = useAuth();
  const { setUser, setLoading, setError, clear } = useUserStore();

  useEffect(() => {
    // Clear user data if not authenticated
    if (!isAuthenticated || !account) {
      clear();
      return;
    }

    // Fetch user data from API
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userData = await apiClient.get("users/me").json<GetMeResponse>();
        setUser(userData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch user:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUser();
  }, [isAuthenticated, account, setUser, setLoading, setError, clear]);
}
