import { create } from "zustand";

export enum CarbonInventoriesTab {
  DRAFTS = 0,
  HUELLAS = 1,
}

interface CarbonInventoriesState {
  activeTab: CarbonInventoriesTab;
  setActiveTab: (tab: CarbonInventoriesTab) => void;
}

export const useCarbonInventoriesStore = create<CarbonInventoriesState>(
  (set) => ({
    activeTab: CarbonInventoriesTab.DRAFTS,
    setActiveTab: (tab) => set({ activeTab: tab }),
  })
);
