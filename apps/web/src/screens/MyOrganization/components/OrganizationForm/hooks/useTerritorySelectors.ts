import { useTerritories } from "@/api/query";
import { useSelectorOptions } from "@/hooks";
import {
  TERRITORY_LEVEL_LABELS,
  TERRITORY_LEVEL_ORDER,
} from "../../../constants";

export type TerritoryLevelState = {
  /** Index into the form's `territoryIds`, outermost first. */
  level: number;
  label: string;
  options: { label: string; value: string }[];
  loading: boolean;
  /**
   * Levels below an unanswered parent, and levels the official catalog has no
   * rows for, are not rendered — the hierarchy is answered "según aplique", so an
   * empty selector would be a dead control rather than a missing answer.
   */
  visible: boolean;
};

/**
 * Loads one level of the territorial hierarchy per selector, each scoped to the
 * node the previous selector holds.
 *
 * The five calls are written out because hooks cannot be called from a loop, and
 * the hierarchy is a fixed five levels deep.
 */
export const useTerritoryLevels = (
  territoryIds: string[] | undefined
): TerritoryLevelState[] => {
  const selected = TERRITORY_LEVEL_ORDER.map(
    (_, level) => territoryIds?.[level] ?? ""
  );

  const queries = [
    useTerritories(null),
    useTerritories(selected[0] || null, { enabled: Boolean(selected[0]) }),
    useTerritories(selected[1] || null, { enabled: Boolean(selected[1]) }),
    useTerritories(selected[2] || null, { enabled: Boolean(selected[2]) }),
    useTerritories(selected[3] || null, { enabled: Boolean(selected[3]) }),
  ];

  const optionsByLevel = [
    useSelectorOptions(queries[0]?.data, "name", "id"),
    useSelectorOptions(queries[1]?.data, "name", "id"),
    useSelectorOptions(queries[2]?.data, "name", "id"),
    useSelectorOptions(queries[3]?.data, "name", "id"),
    useSelectorOptions(queries[4]?.data, "name", "id"),
  ];

  return TERRITORY_LEVEL_ORDER.map((canonicalLevel, level) => {
    const query = queries[level];
    const options = optionsByLevel[level] ?? [];
    const parentAnswered = level === 0 || Boolean(selected[level - 1]);
    const loading = Boolean(query?.isLoading);
    // Label from the level the rows actually carry, so a branch that skips a
    // level in the official catalog is still labelled correctly.
    const rowLevel = query?.data?.[0]?.level ?? canonicalLevel;

    return {
      level,
      label: TERRITORY_LEVEL_LABELS[rowLevel],
      options,
      loading,
      visible: parentAnswered && (options.length > 0 || loading),
    };
  });
};
