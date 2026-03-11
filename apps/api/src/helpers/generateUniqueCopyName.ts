/**
 * Generates a unique copy name using numeric suffixes, similar to
 * how Windows/Linux handle duplicate file names.
 *
 * Appends " (1)", " (2)", etc. to the original name until unique.
 *
 * @example
 * generateUniqueCopyName("Report", ["Report"])
 * // => "Report (1)"
 *
 * generateUniqueCopyName("Report", ["Report", "Report (1)"])
 * // => "Report (2)"
 *
 * generateUniqueCopyName("Report (1)", ["Report", "Report (1)"])
 * // => "Report (1) (1)"
 */
export const generateUniqueCopyName = (
  name: string,
  existingNames: string[]
): string => {
  const existingNameSet = new Set(existingNames);

  let counter = 1;
  let candidateName = `${name} (${counter})`;

  while (existingNameSet.has(candidateName)) {
    counter++;
    candidateName = `${name} (${counter})`;
  }

  return candidateName;
};
