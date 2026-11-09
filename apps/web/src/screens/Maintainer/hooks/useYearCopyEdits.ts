import { useMemo, useReducer } from "react";
import { EmissionFactorSourceSchema } from "@repo/types";
import type { YearCopyChange } from "@repo/utils";

/**
 * What the admin changed on one source factor of the year copy page. A key is
 * present only while it differs from the source factor, so an entry that goes
 * back to the stored value disappears and "has edits" stays honest.
 */
export interface YearCopyEdit {
  /** `null` while the cell is emptied: it blocks the copy. */
  value?: number | null;
  /** As typed; the planner normalizes it as the API stores it. */
  source?: string;
  exclude?: true;
}

/** Keyed by source factor id, never by row index: filtering cannot move an edit. */
export type YearCopyEdits = Readonly<Record<string, YearCopyEdit>>;

type YearCopyEditAction =
  | {
      type: "setValue";
      sourceFactorId: string;
      value: number | null;
      storedValue: number;
    }
  | {
      type: "setSource";
      sourceFactorId: string;
      source: string;
      storedSource: string;
    }
  | { type: "toggleExclude"; sourceFactorId: string }
  | { type: "reset" };

const withEntry = (
  edits: YearCopyEdits,
  sourceFactorId: string,
  entry: YearCopyEdit
): YearCopyEdits => {
  const { [sourceFactorId]: _previous, ...rest } = edits;
  return Object.keys(entry).length > 0
    ? { ...rest, [sourceFactorId]: entry }
    : rest;
};

const isStoredSource = (typed: string, storedSource: string): boolean => {
  const parsed = EmissionFactorSourceSchema.safeParse(typed);
  return parsed.success && parsed.data === storedSource;
};

export const yearCopyEditsReducer = (
  edits: YearCopyEdits,
  action: YearCopyEditAction
): YearCopyEdits => {
  if (action.type === "reset") return {};

  const current = edits[action.sourceFactorId] ?? {};

  switch (action.type) {
    case "setValue": {
      const keepsStored =
        action.value !== null && action.value === action.storedValue;
      const { value: _old, ...withoutValue } = current;
      return withEntry(
        edits,
        action.sourceFactorId,
        keepsStored ? withoutValue : { ...current, value: action.value }
      );
    }
    case "setSource": {
      const keepsStored = isStoredSource(action.source, action.storedSource);
      const { source: _old, ...withoutSource } = current;
      return withEntry(
        edits,
        action.sourceFactorId,
        keepsStored ? withoutSource : { ...current, source: action.source }
      );
    }
    case "toggleExclude": {
      const { exclude, ...withoutExclude } = current;
      return withEntry(
        edits,
        action.sourceFactorId,
        exclude ? withoutExclude : { ...current, exclude: true }
      );
    }
  }
};

/** The edits as the planner reads them. */
export const toYearCopyChanges = (edits: YearCopyEdits): YearCopyChange[] =>
  Object.entries(edits).map(([sourceFactorId, edit]) => ({
    sourceFactorId,
    ...edit,
  }));

export const useYearCopyEdits = () => {
  const [edits, dispatch] = useReducer(yearCopyEditsReducer, {});
  const changes = useMemo(() => toYearCopyChanges(edits), [edits]);
  return {
    edits,
    changes,
    hasEdits: changes.length > 0,
    dispatch,
  };
};
