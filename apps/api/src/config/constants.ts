/** Number of decimal places for percentage values (0–1 range) */
export const PERCENTAGE_PRECISION = 3;

/** Number of decimal places for emission values (tCO2e) */
export const EMISSIONS_PRECISION = 2;

/** Allowed delta when comparing gasDetails totals against declared emission value */
export const EMISSION_FACTOR_GAS_DETAILS_TOLERANCE = 1e-4;

/** Default expiry time in minutes for SAS URLs (read & write) */
export const SAS_URL_EXPIRY_MINUTES = 15;

/** Allowed MIME types for badge uploads */
export const BADGE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
] as const;

/** Maximum badge file size in bytes (default 5 MB, overridden via BADGE_UPLOAD_MAX_BYTES env) */
export const BADGE_UPLOAD_MAX_BYTES = parseInt(
  process.env.BADGE_UPLOAD_MAX_BYTES ?? String(5 * 1024 * 1024),
  10
);
