/**
 * File types recognized by the upload pipeline. Single source of truth:
 * `RouteFileTypeSchema` in `@repo/types` is derived from this tuple.
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
   * minimum between this and the global FILE_UPLOAD_MAX_BYTES.
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

const SUBMISSION_POLICY: FileUploadPolicy = {
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

const CARBON_INVENTORY_POLICY: FileUploadPolicy = {
  allowedExtensions: [
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".xls",
    ".xlsx",
    ".doc",
    ".docx",
    ".csv",
    ".txt",
    ".zip",
    ".gif",
  ],
  allowedMimeTypes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
  ],
  maxBytes: 10 * 1024 * 1024,
};

export const FILE_UPLOAD_POLICIES = {
  BADGE: BADGE_POLICY,
  LEGAL: LEGAL_POLICY,
  CARBON_INVENTORY: CARBON_INVENTORY_POLICY,
  SUBMISSION: SUBMISSION_POLICY,
} as const satisfies Record<FileUploadType, FileUploadPolicy>;

/**
 * Global size bounds in bytes for any uploaded file. The API enforces
 * them at request-upload (declared size) and confirm-upload (size
 * verified via blob HEAD); the web dropzone mirrors them for early
 * rejection. Country deployments adjust these values here.
 */
export const FILE_UPLOAD_MIN_BYTES = 1;
export const FILE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export interface FileUploadLimits {
  readonly minBytes: number;
  readonly maxBytes: number;
  readonly allowedMimeTypes: readonly string[];
  readonly allowedExtensions: readonly string[];
}

/**
 * Resolves the effective upload limits for a use case: the policy
 * allowlists plus the stricter of the global and per-policy size caps.
 */
export function getFileUploadLimits(useCase: FileUploadType): FileUploadLimits {
  const policy: FileUploadPolicy = FILE_UPLOAD_POLICIES[useCase];
  return {
    minBytes: FILE_UPLOAD_MIN_BYTES,
    maxBytes:
      policy.maxBytes !== undefined
        ? Math.min(FILE_UPLOAD_MAX_BYTES, policy.maxBytes)
        : FILE_UPLOAD_MAX_BYTES,
    allowedMimeTypes: policy.allowedMimeTypes,
    allowedExtensions: policy.allowedExtensions,
  };
}

/**
 * Canonical filename extensions for each MIME type accepted by any upload
 * policy. Single source of truth used by the API (to cross-check that a
 * client-declared MIME and extension agree) and by the web client (to build
 * the dropzone `accept` map). Every MIME listed in any policy MUST appear
 * here — the buildAcceptFromPolicy unit test enforces it.
 */
export const CANONICAL_MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
};
