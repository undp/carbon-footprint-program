import {
  OrganizationRole,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { User } from "@repo/types";
import { ReductionProjectStatus } from "@repo/types";
import { canSubmitReductionProjectToVerification } from "@repo/utils";
import {
  linkFilesToSubmission,
  cleanupSourceBlobs,
  type BlobCleanupContext,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import {
  ReductionProjectCannotRequestVerificationError,
  ReductionProjectNotFoundError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  createReductionProjectSubmission,
  reductionProjectWithSubmissionsMinimalSelect,
  validateReductionProjectPrerequisites,
} from "../helpers.js";

export const requestReductionProjectVerificationService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null,
  fileUuids?: string[],
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<void> => {
  const userId = user?.id ? BigInt(user.id) : null;

  const sourceCleanup = await prismaClient.$transaction(async (tx) => {
    const project = await tx.reductionProject.findFirst({
      where: { id: BigInt(id), status: ReductionProjectStatus.ACTIVE },
      select: {
        organizationId: true,
        carbonInventoryId: true,
        ...reductionProjectWithSubmissionsMinimalSelect,
      },
    });

    if (!project) {
      throw new ReductionProjectNotFoundError(id);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(project);

    // DRAFT (first submission) or REVIEWED (resubmission) may be submitted.
    if (!canSubmitReductionProjectToVerification(displayStatus)) {
      throw new ReductionProjectCannotRequestVerificationError(id);
    }

    // Full prerequisites are enforced only at submission: organization ACTIVE +
    // accredited, and the linked CI has an approved verification submission.
    await validateReductionProjectPrerequisites(
      tx,
      project.organizationId.toString(),
      project.carbonInventoryId.toString(),
      userId,
      [OrganizationRole.CONTRIBUTOR, OrganizationRole.ADMIN]
    );

    const submissionId = await createReductionProjectSubmission(
      tx,
      project.id,
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      userId
    );

    let cleanup: BlobCleanupContext | null = null;
    if (fileUuids?.length && blobServiceClient && containerName) {
      ({ sourceCleanup: cleanup } = await linkFilesToSubmission(
        tx,
        submissionId,
        fileUuids,
        blobServiceClient,
        containerName
      ));
    }

    return cleanup;
  });

  // Cleanup source blobs after the transaction commits.
  if (sourceCleanup) {
    await cleanupSourceBlobs(sourceCleanup);
  }
};
