import createError from "@fastify/error";

export const KgMeasurementUnitNotFoundError = createError(
  "KG_MEASUREMENT_UNIT_NOT_FOUND",
  'The "kg" measurement unit is missing from the database. This is a system configuration error.',
  500
);

export const KgMeasurementUnitImmutableError = createError(
  "KG_MEASUREMENT_UNIT_IMMUTABLE",
  'The "kg" measurement unit is system-protected and cannot be modified or deleted.',
  422
);

export const BaseUnitImmutableError = createError(
  "BASE_UNIT_IMMUTABLE",
  "Base measurement units are system-protected and cannot be modified or deleted.",
  422
);

export const BaseUnitToggleNotAllowedError = createError(
  "BASE_UNIT_TOGGLE_NOT_ALLOWED",
  "The isBase field cannot be changed on an existing measurement unit.",
  422
);

export const MagnitudeAlreadyHasBaseUnitError = createError(
  "MAGNITUDE_ALREADY_HAS_BASE_UNIT",
  "A base measurement unit already exists for this magnitude.",
  409
);

export const MeasurementUnitAbbreviationAlreadyExistsError = createError(
  "MEASUREMENT_UNIT_ABBREVIATION_ALREADY_EXISTS",
  "A measurement unit with this abbreviation already exists.",
  409
);

export const MeasurementUnitFieldsLockedError = createError(
  "MEASUREMENT_UNIT_FIELDS_LOCKED",
  "The fields magnitude, baseFactor, and isBase cannot be changed because this unit is referenced by existing data.",
  422
);

export const MeasurementUnitNotFoundError = createError(
  "MEASUREMENT_UNIT_NOT_FOUND",
  "Measurement unit not found (ID: %s)",
  404
);
