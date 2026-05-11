import createError from "@fastify/error";

export const MagnitudeNotFoundError = createError(
  "MAGNITUDE_NOT_FOUND",
  "Magnitude not found (ID: %s)",
  404
);

export const MagnitudeIsSystemError = createError(
  "MAGNITUDE_IS_SYSTEM",
  "System magnitudes cannot be deleted.",
  422
);

export const MagnitudeReferencedError = createError(
  "MAGNITUDE_REFERENCED",
  "This magnitude is in use by measurement units. Remove or reassign those units first.",
  422
);

export const MagnitudeCodeAlreadyExistsError = createError(
  "MAGNITUDE_CODE_ALREADY_EXISTS",
  "A magnitude with this code already exists.",
  409
);
