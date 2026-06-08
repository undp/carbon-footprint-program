import type { BlobServiceClient } from "@azure/storage-blob";
import { CarbonInventoryLineStatus, type PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { GetCarbonInventoryFilesManifestResponse } from "@repo/types";
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
  input: GetCarbonInventoryFilesManifestInput
): Promise<GetCarbonInventoryFilesManifestResponse> => {
  const { carbonInventoryId } = input;

  const lines = await prisma.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId: BigInt(carbonInventoryId),
      status: CarbonInventoryLineStatus.ACTIVE,
      // files for any active line with an active input, complete or not
      inputs: {
        some: {
          isActive: true,
        },
      },
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

  const expectedPrefix = buildCarbonInventoryLineBlobPathPrefix(
    BigInt(carbonInventoryId).toString()
  );

  const files: GetCarbonInventoryFilesManifestResponse["files"] = [];
  let latestExpiresAt: Date | null = null;

  for (const line of lines) {
    const lineIdStr = line.id.toString();
    for (const { file } of line.files) {
      // Defense-in-depth: the Prisma query already scopes lines by
      // `carbonInventoryId`, so a mismatched blobPath would mean a data-
      // integrity bug. Silently drop the row in that case; the missing file
      // in the user's ZIP surfaces the problem to ops.
      if (!file.blobPath.startsWith(expectedPrefix)) {
        continue;
      }

      // RFC 6266: `filename` carries an ASCII-safe display name for clients
      // that ignore `filename*`, while `filename*` carries the UTF-8 form
      // for clients that support it. Using the percent-encoded value in
      // `filename` caused legacy clients to save `%20` literals.
      const encodedName = encodeURIComponent(file.originalName).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      );
      const asciiFallbackName = file.originalName
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/[\\"]/g, "\\$&");
      const { url, expiresAt } = await signReadSasUrl(file.blobPath, {
        contentType: file.mimeType,
        contentDisposition: `attachment; filename="${asciiFallbackName}"; filename*=UTF-8''${encodedName}`,
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
