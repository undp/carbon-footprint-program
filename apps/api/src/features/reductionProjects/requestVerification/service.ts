import { SubmissionType, type PrismaClient } from "@repo/database";
import { ReductionProjectStatus, type User } from "@repo/types";
import type { StorageAdapter } from "@repo/storage";
import {
  canRequestReductionProjectVerification,
  getReductionProjectInvalidFields,
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
 * first-submit and the REVIEWED re-submit. At least one supporting file is
 * required (unlike `carbonInventories/requestVerification`; see the file gate
 * below). Prerequisites (org accredited, linked CI verified), completeness, and
 * semantic validity are enforced here, inside the transaction (TOCTOU).
 * Mirrors `carbonInventories/requestVerification`.
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

    // Semantic invariants beyond field presence: the baseline scenario must be
    // >= the project scenario (a reduction must actually reduce), and the
    // implementation year cannot exceed the reporting year. Mirrors the web
    // form's `superRefine` so an API-direct caller can't bypass client checks.
    if (getReductionProjectInvalidFields(project).length > 0) {
      throw new ReductionProjectInvalidDataError();
    }

    // Postulating for recognition requires at least one supporting file. This
    // INTENTIONALLY diverges from carbonInventories/requestVerification (which
    // treats files as optional): the reduction-project recognition flow is
    // compliance-sensitive and must carry evidence, per team decision. Both the
    // DRAFT first submit and the REVIEWED re-submit reach this gate, so both are
    // held to the same requirement.
    if (!fileUuids?.length) {
      throw new ReductionProjectInvalidDataError();
    }

    const submissionId = await createReductionProjectSubmission(
      tx,
      project.id,
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      createdById
    );

    const { sourceCleanup } = await linkFilesToSubmission(
      tx,
      submissionId,
      fileUuids,
      storage
    );
    await cleanupSourceObjects(sourceCleanup);
  });
};
