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
import {
  linkFilesToSubmission,
  cleanupSourceBlobs,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import { mapBigIntField } from "@/utils/bigint.js";
import {
  ReductionProjectNotFoundError,
  ReductionProjectNotUpdatableError,
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
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<UpdateReductionProjectResponse> => {
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

    if (displayStatus !== ReductionProjectDisplayStatusEnum.REVIEWED) {
      throw new ReductionProjectNotUpdatableError(id, displayStatus);
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
      updateData.implementationDate = data.implementationDate;
    }
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.gwpUsed !== undefined) updateData.gwpUsed = data.gwpUsed;
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

    await tx.reductionProject.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

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
