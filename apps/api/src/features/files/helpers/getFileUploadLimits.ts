import { type Prisma, type PrismaClient } from "@repo/database";
import {
  FILE_UPLOAD_POLICIES,
  type FileUploadType,
  type FileUploadPolicy,
} from "@repo/constants";
import { SystemParameterKeyEnum } from "@repo/types";
import { parseSystemParameterInt } from "@/helpers/parseSystemParameterInt.js";

export interface FileUploadLimits {
  /** Effective minimum size in bytes (global system parameter). */
  minBytes: number;
  /**
   * Effective maximum size in bytes. The minimum between the global
   * FILE_UPLOAD_MAX_BYTES system parameter and the per-use-case
   * `maxBytes` override (when set).
   */
  maxBytes: number;
  /** Allowed MIME types for this use case. */
  allowedMimeTypes: readonly string[];
  /** Allowed filename extensions (with leading dot) for this use case. */
  allowedExtensions: readonly string[];
}

export async function getFileUploadLimits(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  useCase: FileUploadType
): Promise<FileUploadLimits> {
  const minKey = SystemParameterKeyEnum.FILE_UPLOAD_MIN_BYTES;
  const maxKey = SystemParameterKeyEnum.FILE_UPLOAD_MAX_BYTES;

  const rows = await prismaClient.systemParameter.findMany({
    where: { key: { in: [minKey, maxKey] } },
    select: { key: true, value: true, minValue: true, maxValue: true },
  });
  const rowsByKey = new Map(rows.map((row) => [row.key, row] as const));

  const globalMin = parseSystemParameterInt(
    minKey,
    rowsByKey.get(minKey) ?? null
  );
  const globalMax = parseSystemParameterInt(
    maxKey,
    rowsByKey.get(maxKey) ?? null
  );

  const policy: FileUploadPolicy = FILE_UPLOAD_POLICIES[useCase];
  const maxBytes =
    policy.maxBytes !== undefined
      ? Math.min(globalMax, policy.maxBytes)
      : globalMax;

  return {
    minBytes: globalMin,
    maxBytes,
    allowedMimeTypes: policy.allowedMimeTypes,
    allowedExtensions: policy.allowedExtensions,
  };
}
