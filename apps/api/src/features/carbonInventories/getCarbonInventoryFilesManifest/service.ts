import { CarbonInventoryLineStatus, type PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { GetCarbonInventoryFilesManifestResponse } from "@repo/types";
import { CARBON_INVENTORY_FILES_MANIFEST_READ_URL_EXPIRY_MINUTES } from "@/config/constants.js";
import { buildContentDisposition } from "@/utils/contentDisposition.js";
import type { StorageAdapter } from "@repo/storage";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";

interface GetCarbonInventoryFilesManifestInput {
  carbonInventoryId: string;
}

export const getCarbonInventoryFilesManifestService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
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

  const signReadUrl = await storage.createReadUrlSigner(
    CARBON_INVENTORY_FILES_MANIFEST_READ_URL_EXPIRY_MINUTES
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

      const { url, expiresAt } = await signReadUrl(file.blobPath, {
        contentType: file.mimeType,
        contentDisposition: buildContentDisposition(
          "attachment",
          file.originalName
        ),
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
        readUrl: url,
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
        CARBON_INVENTORY_FILES_MANIFEST_READ_URL_EXPIRY_MINUTES * 60 * 1000
    );

  return {
    files,
    expiresAt: responseExpiresAt.toISOString(),
  };
};
