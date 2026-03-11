import createError from "@fastify/error";

export const CategoryNotFoundError = createError(
  "CATEGORY_NOT_FOUND",
  "Category not found (ID: %s)",
  404
);

export const CategoryNameAlreadyExistsError = createError(
  "CATEGORY_NAME_ALREADY_EXISTS",
  "A category with this name already exists for this methodology version",
  409
);

export const CategoryPositionAlreadyExistsError = createError(
  "CATEGORY_POSITION_ALREADY_EXISTS",
  "A category with this position already exists for this methodology version",
  409
);

export const SameCategoryError = createError(
  "SAME_CATEGORY",
  "Both category IDs must be different",
  422
);

export const CategoriesFromDifferentMethodologyVersionsError = createError(
  "CATEGORIES_FROM_DIFFERENT_METHODOLOGY_VERSIONS",
  "Both categories must belong to the same methodology version (Category IDs: %s, %s)",
  422
);

export const MethodologyVersionNotFoundForCategoryError = createError(
  "METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY",
  "Methodology version not found",
  404
);
