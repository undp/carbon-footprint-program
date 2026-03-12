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
  carbonInventoryWithSubmissionsMinimalSelect,
  createCarbonInventorySubmission,
} from "../helpers.js";
import { canSubmitToVerification } from "./helpers.js";
import {
  linkSubmissionFiles,
  cleanupSourceBlobs,
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

    const can = canSubmitToVerification(inventory);
    if (!can)
      throw new CarbonInventoryCannotRequestVerificationError(inventory.id);

    const createdById = user ? BigInt(user.id) : null;

    const submissionId = await createCarbonInventorySubmission(
      tx,
      inventory.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      createdById
    );

    let blobCleanup;
    if (fileUuids?.length) {
      blobCleanup = await linkSubmissionFiles(
        tx,
        blobServiceClient,
        containerName,
        submissionId,
        fileUuids
      );
    }

    return { blobCleanup };
  });

  if (result.blobCleanup) {
    await cleanupSourceBlobs(result.blobCleanup);
  }
};
