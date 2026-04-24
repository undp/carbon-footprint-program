export const subcategoryRecommendationKeys = {
  all: ["subcategoryRecommendations"] as const,
  list: () => [...subcategoryRecommendationKeys.all, "list"] as const,
};
