/**
 * Shared constants for the LEGAL file family (currently: Terms &
 * Conditions). The runtime helper `persistLegalFileRecord` and the
 * `seedTermsConditions` script both build/match blob paths from these
 * values, so they MUST be a single source of truth — drift between the
 * two would silently break the soft-delete-on-replace flow when the
 * seeded T&C is replaced by an admin upload.
 */

/** Top-level blob-path segment for any LEGAL-type file. */
export const LEGAL_BLOB_PREFIX = "LEGAL";

/** Group-key segment used for the Terms & Conditions document family. */
export const LEGAL_TERMS_CONDITIONS_GROUP_KEY = "terms-conditions";

/** Only mime type accepted for legal Terms & Conditions uploads. */
export const LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE = "application/pdf";
