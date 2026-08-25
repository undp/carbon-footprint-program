import { EMISSION_FACTOR_DIMENSION_OTHER_VALUES } from "@/config/constants";

/**
 * Comparable form of a dimension value. Same rule the dimensions maintainer
 * uses to reject duplicate variable names, so a hand-typed "  OTROS " is
 * recognised as the wording the maintainer already considers taken.
 */
const normalizeDimensionValue = (value: string): string =>
  value.trim().toLowerCase();

const OTHER_DIMENSION_VALUES = new Set(
  EMISSION_FACTOR_DIMENSION_OTHER_VALUES.map(normalizeDimensionValue)
);

/**
 * True when a dimension value is the "none of the listed options fits" escape
 * hatch, whichever wording the methodology maintainer gave it. The match covers
 * the whole value, so "Otro proceso" and "Otro país" — real catalog values with
 * their own emission factor — are not escape hatches.
 */
export const isOtherDimensionValue = (value: string): boolean =>
  OTHER_DIMENSION_VALUES.has(normalizeDimensionValue(value));
