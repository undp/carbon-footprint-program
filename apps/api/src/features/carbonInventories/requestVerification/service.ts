import {
  InventoryStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { User } from "@repo/types";
import {
  CarbonInventoryCannotRequestVerificationError,
  CarbonInventoryNotFoundError,
  OrganizationNotAccreditedError,
  OrganizationNotAssociatedError,
} from "../errors.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
  createCarbonInventorySubmission,
} from "../helpers.js";
import { canSubmitToVerification } from "@repo/utils";
import {
  createSubmissionFileRecords,
  moveSubmissionBlobs,
  cleanupSourceBlobs,
  type SubmissionFileInfo,
} from "@/features/files/helpers/linkSubmissionFiles.js";

export const requestVerificationService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string,
  user: User | null,
  fileUuids?: string[],
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<void> => {
  const result = await prismaClient.$transaction(async (tx) => {
    const inventory = await tx.carbonInventory.findFirst({
      where: { id: BigInt(carbonInventoryId), status: InventoryStatus.ACTIVE },
      select: {
        organizationId: true,
        organization: {
          select: {
            summary: {
              select: { isAccredited: true },
            },
          },
        },
        ...carbonInventoryWithSubmissionsMinimalSelect,
      },
    });

    if (!inventory) throw new CarbonInventoryNotFoundError(carbonInventoryId);

    if (!inventory.organizationId) {
      throw new OrganizationNotAssociatedError(carbonInventoryId);
    }

    if (!inventory.organization?.summary?.isAccredited) {
      throw new OrganizationNotAccreditedError(carbonInventoryId);
    }

    const displayStatus = calculateDisplayStatus(inventory);

    const can = canSubmitToVerification(displayStatus);
    if (!can)
      throw new CarbonInventoryCannotRequestVerificationError(inventory.id);

    const createdById = user ? BigInt(user.id) : null;

    const submissionId = await createCarbonInventorySubmission(
      tx,
      inventory.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      createdById
    );

    let fileMetadata: SubmissionFileInfo[] | undefined;
    if (fileUuids?.length) {
      fileMetadata = await createSubmissionFileRecords(
        tx,
        submissionId,
        fileUuids
      );
    }

    return { fileMetadata };
  });

  if (result.fileMetadata && blobServiceClient && containerName) {
    const { sourceCleanup } = await moveSubmissionBlobs(
      blobServiceClient,
      containerName,
      result.fileMetadata,
      prismaClient
    );
    await cleanupSourceBlobs(sourceCleanup);
  }
};
