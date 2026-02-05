import { create } from "zustand";

interface EmissionCaptureState {
  // Global counter to block the submit button if there are active actions
  activeActionsCount: number;

  // Actions
  startAction: () => void;
  endAction: () => void;
}

export const useEmissionCaptureState = create<EmissionCaptureState>((set) => ({
  activeActionsCount: 0,
  subcategoryTotals: {},

  startAction: () =>
    set((state) => ({ activeActionsCount: state.activeActionsCount + 1 })),

  endAction: () =>
    set((state) => ({
      activeActionsCount: Math.max(0, state.activeActionsCount - 1),
    })),
}));
