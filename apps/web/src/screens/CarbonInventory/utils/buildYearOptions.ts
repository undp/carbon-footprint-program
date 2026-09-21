import { CALCULATOR_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";

/**
 * The years a footprint may reasonably be declared for, counting back from the
 * current one.
 *
 * Only the expert mode is offered these: a year outside the catalogue leaves
 * the capture step with nothing to capture with, which is a trade-off an expert
 * can weigh (a catalogue may still be loading for the year they are reporting)
 * and a first-time user cannot.
 */
export const buildDeclarableYears = (
  currentYear: number = new Date().getFullYear()
): number[] =>
  Array.from(
    { length: CALCULATOR_YEARS_RANGE_FROM_CURRENT },
    (_, index) => currentYear - index
  );

/**
 * The options of the footprint year selector: the years the methodology's
 * catalogue covers, plus whatever year the footprint already carries, plus the
 * years the caller offers beyond the catalogue (the expert mode's declarable
 * window; empty for everyone else).
 *
 * The persisted year is merged in rather than assumed to be present. A MUI
 * `Select` paints a value that is not among its options as empty, so a footprint
 * dated to a year the catalogue no longer covers would look like it had no year
 * at all -- and the field being required, the user could only get out of the
 * step by silently re-dating their footprint.
 *
 * Strings, because the form stores the year as text.
 */
export const buildYearOptions = (
  catalogueYears: number[],
  selectedYear: number | null,
  extraYears: number[] = []
): string[] => {
  const years = new Set([...catalogueYears, ...extraYears]);

  if (selectedYear !== null) {
    years.add(selectedYear);
  }

  return [...years].sort((a, b) => a - b).map(String);
};
