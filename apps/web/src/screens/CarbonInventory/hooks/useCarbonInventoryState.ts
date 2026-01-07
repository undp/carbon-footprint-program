import { create } from "zustand";
import { CarbonInventoryLine } from "@repo/types";

interface SubcategoryState {
  lines: CarbonInventoryLine[];
  totalEmission: number;
  isTotalManualEmissionsMode: boolean;
}

interface CarbonInventoryState {
  subcategories: Record<string, SubcategoryState>;

  // Actions
  setSubcategoryLines: (
    subcategoryId: string,
    lines: CarbonInventoryLine[]
  ) => void;
  addLine: (subcategoryId: string, line: CarbonInventoryLine) => void;
  updateLine: (
    subcategoryId: string,
    lineId: string,
    updates: Partial<CarbonInventoryLine>
  ) => void;
  deleteLine: (subcategoryId: string, lineId: string) => void;
  setTotalEmission: (subcategoryId: string, total: number) => void;
  setManualEmissionsMode: (subcategoryId: string, isManual: boolean) => void;
  initializeSubcategory: (
    subcategoryId: string,
    lines: CarbonInventoryLine[]
  ) => void;
  clearSubcategory: (subcategoryId: string) => void;
}

export const useCarbonInventoryState = create<CarbonInventoryState>((set) => ({
  subcategories: {},

  setSubcategoryLines: (subcategoryId, lines) =>
    set((state) => ({
      subcategories: {
        ...state.subcategories,
        [subcategoryId]: {
          ...state.subcategories[subcategoryId],
          lines,
        },
      },
    })),

  addLine: (subcategoryId, line) =>
    set((state) => {
      const subcategory = state.subcategories[subcategoryId] || {
        lines: [],
        totalEmission: 0,
        isTotalManualEmissionsMode: false,
      };

      return {
        subcategories: {
          ...state.subcategories,
          [subcategoryId]: {
            ...subcategory,
            lines: [...subcategory.lines, line],
          },
        },
      };
    }),

  updateLine: (subcategoryId, lineId, updates) =>
    set((state) => {
      const subcategory = state.subcategories[subcategoryId];
      if (!subcategory) return state;

      return {
        subcategories: {
          ...state.subcategories,
          [subcategoryId]: {
            ...subcategory,
            lines: subcategory.lines.map((line) =>
              line.id === lineId ? { ...line, ...updates } : line
            ),
          },
        },
      };
    }),

  deleteLine: (subcategoryId, lineId) =>
    set((state) => {
      const subcategory = state.subcategories[subcategoryId];
      if (!subcategory) return state;

      return {
        subcategories: {
          ...state.subcategories,
          [subcategoryId]: {
            ...subcategory,
            lines: subcategory.lines.filter((line) => line.id !== lineId),
          },
        },
      };
    }),

  setTotalEmission: (subcategoryId, total) =>
    set((state) => ({
      subcategories: {
        ...state.subcategories,
        [subcategoryId]: {
          ...state.subcategories[subcategoryId],
          totalEmission: total,
        },
      },
    })),

  setManualEmissionsMode: (subcategoryId, isManual) =>
    set((state) => ({
      subcategories: {
        ...state.subcategories,
        [subcategoryId]: {
          ...state.subcategories[subcategoryId],
          isTotalManualEmissionsMode: isManual,
        },
      },
    })),

  initializeSubcategory: (subcategoryId, lines) =>
    set((state) => ({
      subcategories: {
        ...state.subcategories,
        [subcategoryId]: {
          lines,
          totalEmission: 0,
          isTotalManualEmissionsMode: false,
        },
      },
    })),

  clearSubcategory: (subcategoryId) =>
    set((state) => {
      const { [subcategoryId]: _, ...rest } = state.subcategories;
      return { subcategories: rest };
    }),
}));
