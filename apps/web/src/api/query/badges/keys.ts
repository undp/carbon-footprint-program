export const badgeKeys = {
  all: ["badges"] as const,
  previews: (badgeTypes?: string[]) =>
    [...badgeKeys.all, "previews", badgeTypes] as const,
};
