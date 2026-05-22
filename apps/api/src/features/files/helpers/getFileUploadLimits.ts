import { type Prisma, type PrismaClient } from "@repo/database";
import {
  FILE_UPLOAD_POLICIES,
  type FileUploadType,
  type FileUploadPolicy,
} from "@repo/constants";
import { SystemParameterKeyEnum } from "@repo/types";
import { getSystemParameterIntValue } from "@/helpers/getSystemParameterIntValue.js";

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
  const [globalMin, globalMax] = await Promise.all([
    getSystemParameterIntValue(
      prismaClient,
      SystemParameterKeyEnum.FILE_UPLOAD_MIN_BYTES
    ),
    getSystemParameterIntValue(
      prismaClient,
      SystemParameterKeyEnum.FILE_UPLOAD_MAX_BYTES
    ),
  ]);

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
