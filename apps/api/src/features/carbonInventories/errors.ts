import createError from "@fastify/error";

export const CarbonInventoryNotFoundError = createError(
  "CARBON_INVENTORY_NOT_FOUND",
  "Carbon inventory with ID %s not found",
  404
);

export const MethodologyNotFoundError = createError(
  "METHODOLOGY_NOT_FOUND",
  "Methodology not found for carbon inventory with ID %s",
  404
);

export const SubcategoryNotFoundError = createError(
  "SUBCATEGORY_NOT_FOUND",
  "One or more subcategories not found",
  404
);

export const SubcategoryNotInMethodologyError = createError(
  "SUBCATEGORY_NOT_IN_METHODOLOGY",
  "One or more subcategories do not belong to the carbon inventory's methodology",
  422
);

export const NoActiveMethodologyError = createError(
  "NO_ACTIVE_METHODOLOGY",
  "No active methodology version found",
  422
);
