import { create } from "zustand";
import type { MaintainerState } from "../types";

export const useMaintainerStore = create<MaintainerState>((set) => ({
  editingMethodology: null,
  startEditing: (methodology) => set({ editingMethodology: methodology }),
  stopEditing: () => set({ editingMethodology: null }),
}));
