import createError from "@fastify/error";

export const SubcategoryNotFoundError = createError(
  "SUBCATEGORY_NOT_FOUND",
  "Subcategory not found (ID: %s)",
  404
);

export const SubcategoryNameAlreadyExistsError = createError(
  "SUBCATEGORY_NAME_ALREADY_EXISTS",
  "A subcategory with this name already exists for this category",
  409
);

export const CategoryNotFoundForSubcategoryError = createError(
  "CATEGORY_NOT_FOUND_FOR_SUBCATEGORY",
  "Category not found",
  404
);

export const CategoryFromDifferentMethodologyError = createError(
  "CATEGORY_FROM_DIFFERENT_METHODOLOGY",
  "Target category must belong to the same methodology version",
  422
);
