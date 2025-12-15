const findPrimitiveDuplicates = <T extends string | number>(data: T[]): T[] => {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const item of data) {
    if (seen.has(item)) duplicates.add(item);
    else seen.add(item);
  }
  return [...duplicates];
};

export const checkForPrimitiveDuplicates = <T extends string | number>(
  data: T[],
  fieldName?: string
): void => {
  const duplicates = findPrimitiveDuplicates<T>(data);
  if (duplicates.length > 0) {
    const fieldLabel = fieldName ? ` in ${fieldName}` : "";
    throw new Error(
      `Duplicated values found${fieldLabel}: ${duplicates.join(", ")}. Please remove the duplicates and try again.`
    );
  }
};
