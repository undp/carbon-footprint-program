const findDuplicates = <T>(data: T[], uniqueKeys: (keyof T)[]): T[] => {
  return data.filter(
    (item, index, self) =>
      self.findIndex((t) => uniqueKeys.every((key) => t[key] === item[key])) !==
      index
  );
};

export const checkForDuplicates = <T>(
  data: T[],
  uniqueKeys: (keyof T)[]
): void => {
  if (uniqueKeys.length === 0)
    throw new Error("checkForDuplicates: uniqueKeys must not be empty");

  const duplicates = findDuplicates<T>(data, uniqueKeys);
  if (duplicates.length > 0) {
    const seen = new Set<string>();
    const uniqueCombinations = duplicates
      .map((item) => uniqueKeys.map((key) => item[key]).join(", "))
      .filter((combo) => {
        if (seen.has(combo)) return false;
        seen.add(combo);
        return true;
      });
    throw new Error(
      `Duplicated data found: ${uniqueCombinations.join("; ")}. Please remove the duplicates and try again.`
    );
  }
};
