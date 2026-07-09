/** Number of decimal places for percentage values (0–1 range) */
export const PERCENTAGE_PRECISION = 3;

/** Allowed delta when comparing gasDetails totals against declared emission value */
export const EMISSION_FACTOR_GAS_DETAILS_TOLERANCE = 1e-4;

/**
 * Expiry (minutes) for the presigned read URLs returned by the
 * carbon-inventory files manifest endpoint. A dedicated constant so it can be
 * tuned independently when a large inventory's tail of file downloads risks
 * running past the URL's validity window.
 */
export const CARBON_INVENTORY_FILES_MANIFEST_READ_URL_EXPIRY_MINUTES = 15;

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

/** Max tokens accepted on a single user chat message before HTTP 413. */
export const CHATBOT_MAX_USER_INPUT_TOKENS = 4000;

/** Max combined token count of prior conversation history before HTTP 413. */
export const CHATBOT_MAX_HISTORY_TOKENS = 8000;

/** Max tokens reserved for RAG context per turn (declared now, unused until V1). */
export const CHATBOT_MAX_RAG_CONTEXT_TOKENS = 12000;

/** Max tokens the LLM may produce in a single turn. */
export const CHATBOT_MAX_OUTPUT_TOKENS = 1500;

/** Max user turns persisted per conversation before HTTP 413. */
export const CHATBOT_MAX_TURNS_PER_CONVERSATION = 50;

/** Days a chatbot conversation persists before it expires (pg_cron purge deferred). */
export const CHATBOT_CONVERSATION_TTL_DAYS = 30;

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
