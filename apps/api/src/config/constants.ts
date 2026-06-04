/** Number of decimal places for percentage values (0–1 range) */
export const PERCENTAGE_PRECISION = 3;

/** Allowed delta when comparing gasDetails totals against declared emission value */
export const EMISSION_FACTOR_GAS_DETAILS_TOLERANCE = 1e-4;

/** Default expiry time in minutes for presigned storage URLs (read & write) */
export const PRESIGNED_URL_EXPIRY_MINUTES = 15;

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

/**
 * Per-address budget (ms) for Node's Happy Eyeballs connection attempts
 * (`autoSelectFamilyAttemptTimeout`). Node 20–24 default it to 250ms, which
 * aborts every outbound connection — http/https (JWKS key download, storage
 * SDKs) and fetch alike — on links whose TCP connect exceeds it (VPNs,
 * deployments far from the identity provider), rejecting all logins with 401.
 * Known upstream issue (nodejs/node#54359); Node 25.2 raised its default to
 * only 500ms, too tight for high-RTT links, so we set the 2500ms value
 * originally proposed upstream (nodejs/node#56738).
 */
export const NETWORK_CONNECTION_ATTEMPT_TIMEOUT_MS = 2500;

/** Object storage backend selected at runtime via STORAGE_PROVIDER env var. */
export enum StorageProvider {
  AZURE_BLOB_STORAGE = "azure_blob_storage",
  MINIO = "minio",
}
