import { FileType } from "@repo/types";

interface BuildBlobPathParams {
  fileType: FileType;
  uuid: string;
  name: string;
  ownerId?: string;
  subPath?: string;
}

export function buildBlobPath({
  fileType,
  uuid,
  name,
  ownerId,
  subPath,
}: BuildBlobPathParams): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (ownerId && subPath) {
    return `${fileType}/${ownerId}/${subPath}/${uuid}-${sanitizedName}`;
  }

  if (ownerId) {
    return `${fileType}/${ownerId}/${uuid}-${sanitizedName}`;
  }

  return `${fileType}/${uuid}-${sanitizedName}`;
}
