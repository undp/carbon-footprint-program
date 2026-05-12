export const buildCountMapFromGroups = <T extends { _count: { _all: number } }>(
  groups: T[],
  getKey: (group: T) => string
): Map<string, number> => {
  return new Map(groups.map((g) => [getKey(g), g._count._all]));
};
