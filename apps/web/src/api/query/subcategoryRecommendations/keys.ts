export const subcategoryRecommendationKeys = {
  all: ["subcategoryRecommendations"] as const,
  list: (methodologyId: string | undefined) =>
    [
      ...subcategoryRecommendationKeys.all,
      "list",
      methodologyId ?? null,
    ] as const,
};
