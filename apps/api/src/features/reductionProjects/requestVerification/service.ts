import { SubmissionType, type PrismaClient } from "@repo/database";
import { ReductionProjectStatus, type User } from "@repo/types";
import type { StorageAdapter } from "@repo/storage";
import {
  canRequestReductionProjectVerification,
  getReductionProjectMissingFields,
} from "@repo/utils";
import {
  ReductionProjectCannotRequestVerificationError,
  ReductionProjectInvalidDataError,
  ReductionProjectNotFoundError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  createReductionProjectSubmission,
  reductionProjectCompletenessSelect,
  reductionProjectWithSubmissionsMinimalSelect,
  validateReductionProjectPrerequisites,
} from "../helpers.js";
import {
  linkFilesToSubmission,
  cleanupSourceObjects,
} from "@/features/files/helpers/linkFilesToSubmission.js";

/**
 * Submits a reduction project for verification. Handles both the DRAFT
 * first-submit and the REVIEWED re-submit. Files are optional. Prerequisites
 * (org accredited, linked CI verified) and completeness are enforced here,
 * inside the transaction (TOCTOU). Mirrors `carbonInventories/requestVerification`.
 */
export const requestReductionProjectVerificationService = async (
  prismaClient: PrismaClient,
  reductionProjectId: string,
  user: User | null,
  storage: StorageAdapter,
  fileUuids?: string[]
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const project = await tx.reductionProject.findFirst({
      where: {
        id: BigInt(reductionProjectId),
        status: ReductionProjectStatus.ACTIVE,
      },
      select: {
        ...reductionProjectWithSubmissionsMinimalSelect,
        ...reductionProjectCompletenessSelect,
        organizationId: true,
        carbonInventoryId: true,
      },
    });

    if (!project) {
      throw new ReductionProjectNotFoundError(reductionProjectId);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(project);
    if (!canRequestReductionProjectVerification(displayStatus)) {
      throw new ReductionProjectCannotRequestVerificationError(
        reductionProjectId
      );
    }

    const createdById = user ? BigInt(user.id) : null;

    // Prerequisites: org ACTIVE + accredited, linked CI ACTIVE + belongs to the
    // org + has an APPROVED verification. Membership is already enforced by the
    // route's `reductionProject` auth, so no allowedRoles here (mirrors CI).
    await validateReductionProjectPrerequisites(
      tx,
      project.organizationId.toString(),
      project.carbonInventoryId.toString(),
      createdById
    );

    if (getReductionProjectMissingFields(project).length > 0) {
      throw new ReductionProjectInvalidDataError();
    }

    const submissionId = await createReductionProjectSubmission(
      tx,
      project.id,
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      createdById
    );

    if (fileUuids?.length) {
      const { sourceCleanup } = await linkFilesToSubmission(
        tx,
        submissionId,
        fileUuids,
        storage
      );
      await cleanupSourceObjects(sourceCleanup);
    }
  });
};
