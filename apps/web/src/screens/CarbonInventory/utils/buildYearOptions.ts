/**
 * The options of the footprint year selector: the years the methodology's
 * catalogue covers, plus whatever year the footprint already carries.
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
  selectedYear: number | null
): string[] => {
  const years = new Set(catalogueYears);

  if (selectedYear !== null) {
    years.add(selectedYear);
  }

  return [...years].sort((a, b) => a - b).map(String);
};
