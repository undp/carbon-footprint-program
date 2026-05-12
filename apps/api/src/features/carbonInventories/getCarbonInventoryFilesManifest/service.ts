import type { BlobServiceClient } from "@azure/storage-blob";
import { CarbonInventoryLineStatus, type PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { GetCarbonInventoryFilesManifestResponse } from "@repo/types";
import type { FastifyBaseLogger } from "fastify";
import { CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES } from "@/config/constants.js";
import { createReadSasUrlSigner } from "@/services/blobService.js";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";

interface GetCarbonInventoryFilesManifestInput {
  carbonInventoryId: string;
}

export const getCarbonInventoryFilesManifestService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  log: FastifyBaseLogger,
  input: GetCarbonInventoryFilesManifestInput
): Promise<GetCarbonInventoryFilesManifestResponse> => {
  const { carbonInventoryId } = input;

  const lines = await prisma.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId: BigInt(carbonInventoryId),
      status: CarbonInventoryLineStatus.ACTIVE,
    },
    select: {
      id: true,
      subcategory: {
        select: {
          name: true,
          category: { select: { name: true } },
        },
      },
      files: {
        where: {
          file: {
            status: FileStatus.ACTIVE,
            deletedAt: null,
          },
        },
        select: {
          file: {
            select: {
              uuid: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              blobPath: true,
            },
          },
        },
      },
    },
  });

  const signReadSasUrl = await createReadSasUrlSigner(
    blobServiceClient,
    containerName,
    CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES
  );

  const expectedPrefix =
    buildCarbonInventoryLineBlobPathPrefix(carbonInventoryId);

  const files: GetCarbonInventoryFilesManifestResponse["files"] = [];
  let latestExpiresAt: Date | null = null;

  for (const line of lines) {
    const lineIdStr = line.id.toString();
    for (const { file } of line.files) {
      if (!file.blobPath.startsWith(expectedPrefix)) {
        log.warn(
          {
            carbonInventoryId,
            fileUuid: file.uuid,
            blobPath: file.blobPath,
          },
          "Skipping line file with cross-inventory blob path"
        );
        continue;
      }

      const encodedName = encodeURIComponent(file.originalName);
      const { url, expiresAt } = await signReadSasUrl(file.blobPath, {
        contentType: file.mimeType,
        contentDisposition: `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
      });

      if (!latestExpiresAt || expiresAt > latestExpiresAt) {
        latestExpiresAt = expiresAt;
      }

      files.push({
        fileUuid: file.uuid,
        lineId: lineIdStr,
        categoryName: line.subcategory.category.name,
        subcategoryName: line.subcategory.name,
        originalName: file.originalName,
        sasUrl: url,
        expiresAt: expiresAt.toISOString(),
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
      });
    }
  }

  const responseExpiresAt =
    latestExpiresAt ??
    new Date(
      Date.now() +
        CARBON_INVENTORY_FILES_MANIFEST_SAS_EXPIRY_MINUTES * 60 * 1000
    );

  return {
    files,
    expiresAt: responseExpiresAt.toISOString(),
  };
};
