import createError from "@fastify/error";

export const EmissionFactorDimensionNotFoundError = createError(
  "EMISSION_FACTOR_DIMENSION_NOT_FOUND",
  "Emission factor dimension not found",
  404
);
