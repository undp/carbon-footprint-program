import {
  InventoryStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { User } from "@repo/types";
import {
  linkFilesToSubmission,
  cleanupSourceBlobs,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import { canRequestReductionProjectVerification } from "@repo/utils";
import {
  ReductionProjectCannotRequestVerificationError,
  ReductionProjectNotFoundError,
  ReductionProjectOrganizationNotAccreditedError,
  ReductionProjectOrganizationNotAssociatedError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  createReductionProjectSubmission,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";

export const requestReductionProjectVerificationService = async (
  prismaClient: PrismaClient,
  reductionProjectId: string,
  user: User | null,
  fileUuids?: string[],
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const project = await tx.reductionProject.findFirst({
      where: { id: BigInt(reductionProjectId), status: InventoryStatus.ACTIVE },
      select: {
        organizationId: true,
        organization: {
          select: {
            summary: {
              select: { isAccredited: true },
            },
          },
        },
        ...reductionProjectWithSubmissionsMinimalSelect,
      },
    });

    if (!project) {
      throw new ReductionProjectNotFoundError(reductionProjectId);
    }

    if (!project.organizationId) {
      throw new ReductionProjectOrganizationNotAssociatedError(
        reductionProjectId
      );
    }

    if (!project.organization?.summary?.isAccredited) {
      throw new ReductionProjectOrganizationNotAccreditedError(
        reductionProjectId
      );
    }

    const displayStatus = calculateReductionProjectDisplayStatus(project);

    if (!canRequestReductionProjectVerification(displayStatus)) {
      throw new ReductionProjectCannotRequestVerificationError(
        reductionProjectId
      );
    }

    const createdById = user ? BigInt(user.id) : null;

    const submissionId = await createReductionProjectSubmission(
      tx,
      BigInt(reductionProjectId),
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      createdById
    );

    if (fileUuids?.length && blobServiceClient && containerName) {
      const { sourceCleanup } = await linkFilesToSubmission(
        tx,
        submissionId,
        fileUuids,
        blobServiceClient,
        containerName
      );
      await cleanupSourceBlobs(sourceCleanup);
    }
  });
};
