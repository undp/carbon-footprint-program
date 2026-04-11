import {
  OrganizationRole,
  Prisma,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type {
  UpdateReductionProjectRequest,
  UpdateReductionProjectResponse,
  User,
} from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import {
  linkFilesToSubmission,
  cleanupSourceBlobs,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import { mapBigIntField } from "@/utils/bigint.js";
import {
  ReductionProjectNotFoundError,
  ReductionProjectUnderReviewError,
  ReductionProjectDraftNotUpdatableError,
  ReductionProjectRejectedError,
  ReductionProjectNotEditableError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  createReductionProjectSubmission,
  reductionProjectWithSubmissionsMinimalSelect,
  validateReductionProjectPrerequisites,
} from "../helpers.js";
import {
  ReductionProjectDisplayStatusEnum,
  ReductionProjectStatus,
} from "@repo/types";

export const updateReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateReductionProjectRequest,
  user: User | null,
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<UpdateReductionProjectResponse> => {
  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  const userId = user?.id ? BigInt(user.id) : null;

  const sourceCleanup = await prismaClient.$transaction(async (tx) => {
    await validateReductionProjectPrerequisites(
      tx,
      data.organizationId,
      data.carbonInventoryId,
      userId,
      [OrganizationRole.CONTRIBUTOR, OrganizationRole.ADMIN]
    );

    const existing = await tx.reductionProject.findUnique({
      where: { id: BigInt(id), status: ReductionProjectStatus.ACTIVE },
      select: { ...reductionProjectWithSubmissionsMinimalSelect },
    });

    if (!existing) {
      throw new ReductionProjectNotFoundError(id);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(existing);

    if (displayStatus === ReductionProjectDisplayStatusEnum.DRAFT) {
      throw new ReductionProjectDraftNotUpdatableError(id);
    }

    if (displayStatus === ReductionProjectDisplayStatusEnum.SUBMITTED) {
      throw new ReductionProjectUnderReviewError();
    }

    if (displayStatus === ReductionProjectDisplayStatusEnum.REJECTED) {
      throw new ReductionProjectRejectedError(id);
    }

    if (displayStatus === ReductionProjectDisplayStatusEnum.APPROVED) {
      throw new ReductionProjectNotEditableError(id);
    }

    // Only REVIEWED reaches here
    const updateData: Prisma.ReductionProjectUncheckedUpdateInput = {
      updatedById: userId,
      name: data.name,
      organizationId: mapBigIntField(data.organizationId),
      carbonInventoryId: mapBigIntField(data.carbonInventoryId),
      subcategoryId: mapBigIntField(data.subcategoryId),
    };

    if (data.implementationDate !== undefined) {
      updateData.implementationDate = data.implementationDate
        ? new Date(data.implementationDate)
        : null;
    }
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.gwpUsed !== undefined) updateData.gwpUsed = data.gwpUsed;
    if (data.useNationalGwp !== undefined)
      updateData.useNationalGwp = data.useNationalGwp;
    if (data.consideredGei !== undefined)
      updateData.consideredGei = data.consideredGei;
    if (data.reportedElsewhere !== undefined)
      updateData.reportedElsewhere = data.reportedElsewhere;
    if (data.reportedElsewhereDescription !== undefined) {
      updateData.reportedElsewhereDescription =
        data.reportedElsewhereDescription;
    }
    if (data.year !== undefined) updateData.year = data.year;
    if (data.baselineScenario !== undefined)
      updateData.baselineScenario = data.baselineScenario;
    if (data.projectScenario !== undefined)
      updateData.projectScenario = data.projectScenario;

    try {
      await tx.reductionProject.update({
        where: { id: BigInt(id) },
        data: updateData,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ReductionProjectNotFoundError(id);
      }
      throw error;
    }

    const submissionId = await createReductionProjectSubmission(
      tx,
      BigInt(id),
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      userId
    );

    const { sourceCleanup: cleanup } = await linkFilesToSubmission(
      tx,
      submissionId,
      data.fileUuids,
      blobServiceClient,
      containerName
    );

    return cleanup;
  });

  // Cleanup source blobs after the transaction commits
  await cleanupSourceBlobs(sourceCleanup);

  return {};
};
