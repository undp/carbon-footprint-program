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
