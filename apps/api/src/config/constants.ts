/** Number of decimal places for percentage values (0–1 range) */
export const PERCENTAGE_PRECISION = 3;

/** Allowed delta when comparing gasDetails totals against declared emission value */
export const EMISSION_FACTOR_GAS_DETAILS_TOLERANCE = 1e-4;

/** Default expiry time in minutes for SAS URLs (read & write) */
export const SAS_URL_EXPIRY_MINUTES = 15;

/**
 * Expiry (minutes) for the SAS URLs returned by the carbon-inventory files
 * manifest endpoint. Kept separate from `SAS_URL_EXPIRY_MINUTES` so it can be
 * tuned independently when a large inventory's tail of file downloads risks
 * running past the SAS window.
 */
export const CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES = 15;

/** Allowed MIME types for badge uploads */
export const BADGE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
] as const;

/** Maximum badge file size in bytes (5 MB) */
export const BADGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

// Must match the value used in the organization_summary_view SQL migration
export const MEASURING_ORGANIZATIONS_YEAR_RANGE = 2;
