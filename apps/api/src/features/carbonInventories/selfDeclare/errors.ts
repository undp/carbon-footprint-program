import createError from "@fastify/error";

export const CarbonInventoryCannotSelfDeclareError = createError(
  "CARBON_INVENTORY_CANNOT_SELF_DECLARE",
  "Carbon inventory %s cannot be self-declared",
  422
);
