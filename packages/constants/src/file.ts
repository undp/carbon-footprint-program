/**
 * Shared file-attachment constants for the CARBON_INVENTORY file family
 * (per-line emission-capture attachments). Used as the single source of
 * truth across the stack: the API's confirm-upload validator enforces them
 * server-side, and the web `FileUpload` component uses them as `accept`
 * and `maxSizeMB` UX hints.
 */

/** MIME types accepted for carbon-inventory line attachments. */
export const CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
] as const;

export type CarbonInventoryLineFileMimeType =
  (typeof CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES)[number];

/** Maximum allowed file size for any carbon-inventory line attachment (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
