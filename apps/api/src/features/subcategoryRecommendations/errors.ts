import createError from "@fastify/error";

export const SubcategoryRecommendationGroupAlreadyExistsError = createError(
  "SUBCATEGORY_RECOMMENDATION_GROUP_ALREADY_EXISTS",
  "An active recommendation group already exists for this sector and subsector",
  409
);
