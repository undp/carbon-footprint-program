import { create } from "zustand";

interface CarbonInventoriesState {
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

export const useCarbonInventoriesStore = create<CarbonInventoriesState>(
  (set) => ({
    activeTab: 0,
    setActiveTab: (tab) => set({ activeTab: tab }),
  })
);
