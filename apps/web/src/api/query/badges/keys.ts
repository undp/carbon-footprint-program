export const badgeKeys = {
  all: ["badges"] as const,
  previews: (badgeTypes?: string[]) =>
    [...badgeKeys.all, "previews", badgeTypes] as const,
  catalog: () => [...badgeKeys.all, "catalog"] as const,
};
