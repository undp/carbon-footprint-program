export enum TerritoryQueryKey {
  Root = "territories",
}

export const territoryKeys = {
  /** Children of `parentId`, or the roots of the hierarchy when it is null. */
  children: (parentId: string | null) =>
    [TerritoryQueryKey.Root, parentId ?? "root"] as const,
  /** The levels of the hierarchy the catalog holds rows for. */
  levels: () => [TerritoryQueryKey.Root, "levels"] as const,
};
