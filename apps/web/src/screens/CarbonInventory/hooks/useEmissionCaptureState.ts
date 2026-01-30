import { create } from "zustand";

interface EmissionCaptureState {
  // Global counter to block the submit button if there are active actions
  activeActionsCount: number;
  // Totals per subcategory to calculate the category total
  subcategoryTotals: Record<string, number>;

  // Actions
  startAction: () => void;
  endAction: () => void;
  setSubcategoryTotal: (subcategoryId: string, total: number) => void;
  reset: () => void;
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

  setSubcategoryTotal: (subcategoryId, total) =>
    set((state) => ({
      subcategoryTotals: {
        ...state.subcategoryTotals,
        [subcategoryId]: total,
      },
    })),

  reset: () => set({ activeActionsCount: 0, subcategoryTotals: {} }),
}));
