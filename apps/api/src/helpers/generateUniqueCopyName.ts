/**
 * Generates a unique name by appending "(copia)" suffixes.
 * If the resulting name already exists, it keeps appending "(copia)" until unique.
 *
 * @example
 * generateUniqueCopyName("Report", ["Report", "Report (copia)"])
 * // => "Report (copia) (copia)"
 */
export const generateUniqueCopyName = (
  name: string,
  existingNames: string[]
): string => {
  const existingNameSet = new Set(existingNames);
  let candidateName = `${name} (copia)`;

  while (existingNameSet.has(candidateName)) {
    candidateName = `${candidateName} (copia)`;
  }
  return candidateName;
};
