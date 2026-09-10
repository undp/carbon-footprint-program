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

export const SubcategoryPositionAlreadyExistsError = createError(
  "SUBCATEGORY_POSITION_ALREADY_EXISTS",
  "A subcategory with this position already exists for this category",
  409
);

/**
 * A move or delete found the row in another category than the one it locked.
 *
 * The category to lock is chosen from an unlocked read, and the row is locked
 * after it (the order swapSubcategoryPositions uses, so the two paths cannot
 * deadlock). A row that left that category in between cannot have its old
 * sequence re-packed under any lock this transaction holds, and the order the
 * client acted on is stale anyway, so the write is refused rather than applied
 * to positions nothing is guarding.
 */
export const SubcategoryConcurrentlyMovedError = createError(
  "SUBCATEGORY_CONCURRENTLY_MOVED",
  "The subcategory was moved to another category while this request was in flight (ID: %s)",
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

export const SameSubcategoryError = createError(
  "SAME_SUBCATEGORY",
  "Both subcategory IDs must be different",
  422
);

export const SubcategoriesFromDifferentCategoriesError = createError(
  "SUBCATEGORIES_FROM_DIFFERENT_CATEGORIES",
  "Both subcategories must belong to the same category (Subcategory IDs: %s, %s)",
  422
);
