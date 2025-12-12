const findPrimitiveDuplicates = <T extends string | number>(data: T[]): T[] => {
  return data.filter((item, index, self) => self.indexOf(item) !== index);
};

export const checkForPrimitiveDuplicates = <T extends string | number>(
  data: T[],
  fieldName?: string
): void => {
  const duplicates = findPrimitiveDuplicates<T>(data);
  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    const fieldLabel = fieldName ? ` in ${fieldName}` : "";
    throw new Error(
      `Duplicated values found${fieldLabel}: ${uniqueDuplicates.join(", ")}. Please remove the duplicates and try again.`
    );
  }
};
