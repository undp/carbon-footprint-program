import { create } from "zustand";
import { CarbonInventoryLine } from "@repo/types";
import { SubcategoryId, LineId } from "../types/EmissionCaptureTypes";

interface SubcategoryState {
  lines: CarbonInventoryLine[];
  totalEmission: number;
  isTotalManualEmissionsMode: boolean;
}

interface CarbonInventoryState {
  subcategories: Record<SubcategoryId, SubcategoryState>;

  // Actions
  setSubcategoryLines: (
    subcategoryId: SubcategoryId,
    lines: CarbonInventoryLine[]
  ) => void;
  addLine: (subcategoryId: SubcategoryId, line: CarbonInventoryLine) => void;
  updateLine: (
    subcategoryId: SubcategoryId,
    lineId: LineId,
    updates: Partial<CarbonInventoryLine>
  ) => void;
  deleteLine: (subcategoryId: SubcategoryId, lineId: LineId) => void;
  setTotalEmission: (subcategoryId: SubcategoryId, total: number) => void;
  setManualEmissionsMode: (
    subcategoryId: SubcategoryId,
    isManual: boolean
  ) => void;
  initializeSubcategory: (
    subcategoryId: SubcategoryId,
    lines: CarbonInventoryLine[]
  ) => void;
  clearSubcategory: (subcategoryId: SubcategoryId) => void;
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
