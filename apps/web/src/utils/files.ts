export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
};

export const formatMimeType = (mimeType: string): string => {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "Excel",
    "application/vnd.ms-excel": "Excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word",
    "application/msword": "Word",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
  };
  return map[mimeType] ?? mimeType.split("/")[1]?.toUpperCase() ?? "Archivo";
};

const getFileFingerprint = (file: File) =>
  [file.name, file.size, file.lastModified, file.type].join("::");

export const mergeUniqueFiles = (
  existingFiles: File[],
  incomingFiles: File[]
): File[] => {
  const seen = new Set(existingFiles.map(getFileFingerprint));
  const uniqueIncoming: File[] = [];

  for (const file of incomingFiles) {
    const fingerprint = getFileFingerprint(file);

    if (seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    uniqueIncoming.push(file);
  }

  return [...existingFiles, ...uniqueIncoming];
};

// Zip files are reported with inconsistent MIME types across browsers/OSes
// (Windows often reports `application/x-zip-compressed`, others may report
// `application/octet-stream`). The `.zip` extension is added as a fallback so
// dropzone accepts legitimate zips even when the browser-reported MIME differs.
const ZIP_MIME_TYPES = new Set<string>([
  "application/zip",
  "application/x-zip-compressed",
]);

// Builds the `accept` prop expected by react-dropzone (`Record<MIME, ext[]>`)
// from a flat list of allowed MIME types. Use this whenever a dropzone needs
// to accept a configurable set of file types — keeps the zip MIME quirk
// handled in one place.
export const buildDropzoneAcceptMap = (
  allowedMimeTypes: readonly string[]
): Record<string, string[]> =>
  allowedMimeTypes.reduce<Record<string, string[]>>((acc, mime) => {
    acc[mime] = ZIP_MIME_TYPES.has(mime) ? [".zip"] : [];
    return acc;
  }, {});
