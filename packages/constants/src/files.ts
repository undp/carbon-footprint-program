/**
 * File types recognized by the upload pipeline. Must stay in sync with
 * `RouteFileTypeSchema` in `@repo/types`. Declared here (and not imported
 * from `@repo/types`) so this package stays dependency-free.
 */
export const FILE_UPLOAD_TYPES = [
  "SUBMISSION",
  "BADGE",
  "LEGAL",
  "CARBON_INVENTORY",
] as const;

export type FileUploadType = (typeof FILE_UPLOAD_TYPES)[number];

/**
 * Per file-type upload policy. Defines the canonical MIME types and
 * filename extensions accepted for each FileType. The API enforces this
 * server-side at request-upload and confirm-upload time; the web client
 * derives the dropzone `accept` map from the same source so frontend
 * and backend stay in sync.
 *
 * A specific endpoint or UI surface MAY restrict further by passing
 * its own subset, but never widen.
 */
export interface FileUploadPolicy {
  readonly allowedExtensions: readonly string[];
  readonly allowedMimeTypes: readonly string[];
  /**
   * Optional per-use-case upper bound. The effective max is the
   * minimum between this and the global FILE_UPLOAD_MAX_BYTES
   * system parameter.
   */
  readonly maxBytes?: number;
}

const BADGE_POLICY: FileUploadPolicy = {
  allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".svg"],
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  maxBytes: 5 * 1024 * 1024,
};

const LEGAL_POLICY: FileUploadPolicy = {
  allowedExtensions: [".pdf"],
  allowedMimeTypes: ["application/pdf"],
};

const DOCUMENT_BUNDLE_POLICY: FileUploadPolicy = {
  allowedExtensions: [
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".xls",
    ".xlsx",
  ],
  allowedMimeTypes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

export const FILE_UPLOAD_POLICIES = {
  BADGE: BADGE_POLICY,
  LEGAL: LEGAL_POLICY,
  CARBON_INVENTORY: DOCUMENT_BUNDLE_POLICY,
  SUBMISSION: DOCUMENT_BUNDLE_POLICY,
} as const satisfies Record<FileUploadType, FileUploadPolicy>;
