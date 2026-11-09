import {
  CALCULATOR_YEARS_RANGE_FROM_CURRENT,
  EMISSION_FACTOR_YEARS_RANGE_AHEAD_OF_CURRENT,
} from "@/config/constants";

/**
 * The years a factor can be dated with in the maintainer, newest first:
 * `[currentYear - 4 .. currentYear + 1]`, the same lower bound as the footprint
 * year selector plus one year of forward slack. A UI window only: the request
 * schemas enforce a wide static bound instead.
 */
export const getEmissionFactorYearOptions = (
  currentYear: number = new Date().getFullYear()
): number[] =>
  Array.from(
    {
      length:
        CALCULATOR_YEARS_RANGE_FROM_CURRENT +
        EMISSION_FACTOR_YEARS_RANGE_AHEAD_OF_CURRENT,
    },
    (_, index) =>
      currentYear + EMISSION_FACTOR_YEARS_RANGE_AHEAD_OF_CURRENT - index
  );

/**
 * Computed at module load like the footprint selector's own list: the window
 * only slides on 1 January. Shared by the grid's «Año» column and the year copy
 * page's «Destino».
 */
export const EMISSION_FACTOR_YEAR_OPTIONS = getEmissionFactorYearOptions();
