export const termsConditionsKeys = {
  all: ["termsConditions"] as const,
  current: () => [...termsConditionsKeys.all, "current"] as const,
};
