import { useTerritories, useTerritoryLevels } from "@/api/query";
import { useSelectorOptions } from "@/hooks";
import {
  TERRITORY_LEVEL_LABELS,
  TERRITORY_LEVEL_ORDER,
  TERRITORY_LEVEL_PROMPTS,
} from "../../../constants";

export type TerritorySelectorState = {
  /** Index into the form's `territoryIds`, outermost first. */
  level: number;
  label: string;
  options: { label: string; value: string }[];
  loading: boolean;
  /**
   * Locked until the level above it is answered, mirroring the sector and
   * economic-activity pair, and locked again when the branch the parent leads to
   * has no rows — the Distrito Nacional is itself the municipal level, so it
   * ends the chain.
   */
  disabled: boolean;
  /**
   * Only the levels the catalog holds rows for are rendered at all. A level the
   * official source has not been obtained for would be a control the registrant
   * can never fill, and the catalog is asked rather than assumed so the day it
   * lands the selector appears without a code change.
   *
   * Nothing renders until that answer arrives, so the section fills in one step
   * rather than growing a selector at a time as the registrant answers.
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
export const useTerritorySelectors = (
  territoryIds: string[] | undefined
): TerritorySelectorState[] => {
  const { data: catalogLevels, isLoading: catalogLevelsLoading } =
    useTerritoryLevels();

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
    const parentLevel = TERRITORY_LEVEL_ORDER[level - 1];
    const parentAnswered = level === 0 || Boolean(selected[level - 1]);
    const loading = Boolean(query?.isLoading) || catalogLevelsLoading;
    // Label from the level the rows actually carry, so a branch that skips a
    // level in the official catalog is still labelled correctly.
    const rowLevel = query?.data?.[0]?.level ?? canonicalLevel;

    return {
      level,
      label:
        parentAnswered || !parentLevel
          ? TERRITORY_LEVEL_LABELS[rowLevel]
          : TERRITORY_LEVEL_PROMPTS[parentLevel],
      options,
      loading,
      disabled: !parentAnswered || options.length === 0,
      visible: (catalogLevels ?? []).includes(canonicalLevel),
    };
  });
};
