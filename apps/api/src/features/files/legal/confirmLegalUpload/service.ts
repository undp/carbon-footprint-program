import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  type ConfirmLegalUploadBody,
  type ConfirmLegalUploadResponse,
  FileType,
} from "@repo/types";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { persistLegalFileRecord } from "../../helpers/persistLegalFileRecord.js";
import { LEGAL_TERMS_CONDITIONS_GROUP_KEY } from "@repo/constants";

type ConfirmLegalUploadInput = ConfirmLegalUploadBody & { userId?: string };

export const confirmLegalUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: ConfirmLegalUploadInput
): Promise<ConfirmLegalUploadResponse> => {
  const { uuid, originalName, userId } = input;

  const blobPath = buildBlobPath({
    fileType: FileType.LEGAL,
    groupKey: LEGAL_TERMS_CONDITIONS_GROUP_KEY,
    uuid,
    name: originalName,
  });

  return persistLegalFileRecord(prisma, blobStorage, {
    uuid,
    blobPath,
    originalName,
    userId,
  });
};
