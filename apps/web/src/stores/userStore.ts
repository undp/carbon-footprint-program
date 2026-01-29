import { create } from "zustand";
import type { GetMeResponse } from "@repo/types";

interface UserState {
  user: GetMeResponse | null;
  isLoading: boolean;
  error: Error | null;
  setUser: (user: GetMeResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clear: () => void;
}

/**
 * Zustand store for user data
 * Provides global access to current user information
 * Initialized by useInitializeUser hook on app mount
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clear: () => set({ user: null, isLoading: false, error: null }),
}));
