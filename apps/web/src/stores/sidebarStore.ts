import { create } from "zustand";

const SIDEBAR_PINNED_KEY = "huella-latam:sidebar-pinned";

const readPinned = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_PINNED_KEY) === "true";
};

interface SidebarState {
  isPinned: boolean;
  togglePin: () => void;
  /** Forces the sidebar open regardless of hover/pin (e.g. while an onboarding
   *  highlight is spotlighting a menu item so its label is readable). */
  isForcedOpen: boolean;
  setForcedOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isPinned: readPinned(),
  togglePin: () => {
    const next = !get().isPinned;
    window.localStorage.setItem(SIDEBAR_PINNED_KEY, String(next));
    set({ isPinned: next });
  },
  isForcedOpen: false,
  setForcedOpen: (open) => set({ isForcedOpen: open }),
}));
