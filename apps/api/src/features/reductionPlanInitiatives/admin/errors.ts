import createError from "@fastify/error";

export const ReductionPlanInitiativeNotFoundError = createError(
  "REDUCTION_PLAN_INITIATIVE_NOT_FOUND",
  "Reduction plan initiative not found (ID: %s)",
  404
);

export const SubcategoryNotFoundForInitiativeError = createError(
  "SUBCATEGORY_NOT_FOUND_FOR_INITIATIVE",
  "Subcategory not found (ID: %s)",
  404
);
