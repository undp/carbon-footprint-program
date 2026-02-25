import { create } from "zustand";
import type { MaintainerState } from "../types";

export const useMaintainerStore = create<MaintainerState>((set) => ({
  selectedMethodology: null,
  editingMethodology: null,
  selectMethodology: (methodology) =>
    set({ selectedMethodology: methodology, editingMethodology: null }),
  startEditing: (methodology) =>
    set({ editingMethodology: methodology, selectedMethodology: null }),
  stopEditing: () => set({ editingMethodology: null }),
}));
