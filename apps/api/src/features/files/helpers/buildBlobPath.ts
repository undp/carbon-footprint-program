import { FileType } from "@repo/types";

interface BuildBlobPathParams {
  fileType: FileType;
  uuid: string;
  name: string;
  groupKey?: string;
  subPath?: string;
}

export function buildBlobPath({
  fileType,
  uuid,
  name,
  groupKey,
  subPath,
}: BuildBlobPathParams): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (groupKey && subPath) {
    return `${fileType}/${groupKey}/${subPath}/${uuid}-${sanitizedName}`;
  }

  if (groupKey) {
    return `${fileType}/${groupKey}/${uuid}-${sanitizedName}`;
  }

  return `${fileType}/${uuid}-${sanitizedName}`;
}

interface BuildBlobPathPrefixParams {
  fileType: FileType;
  groupKey: string;
  subPath?: string;
}

export function buildBlobPathPrefix({
  fileType,
  groupKey,
  subPath,
}: BuildBlobPathPrefixParams): string {
  if (subPath) {
    return `${fileType}/${groupKey}/${subPath}/`;
  }
  return `${fileType}/${groupKey}/`;
}
