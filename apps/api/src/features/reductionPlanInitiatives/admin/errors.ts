import createError from "@fastify/error";

export const ReductionPlanInitiativeNotFoundError = createError(
  "REDUCTION_PLAN_INITIATIVE_NOT_FOUND",
  "Reduction plan initiative not found (ID: %s)",
  404
);

export const SubcategoryNotFoundForReductionPlanInitiativeError = createError(
  "SUBCATEGORY_NOT_FOUND_FOR_REDUCTION_PLAN_INITIATIVE",
  "Subcategory not found (ID: %s)",
  404
);

export const ReductionPlanInitiativeTitleAlreadyExistsError = createError(
  "REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS",
  "A reduction plan initiative with this title already exists in this subcategory",
  409
);
