import { SubmissionType, type PrismaClient, Prisma } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type {
  UpdateReductionProjectRequest,
  UpdateReductionProjectResponse,
  User,
} from "@repo/types";
import {
  FileAttachmentsNotSupportedError,
  FileAttachmentsRequiredError,
} from "@/features/organizations/errors.js";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import {
  linkFilesToSubmission,
  cleanupSourceBlobs,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import { mapBigIntField } from "@/utils/bigint.js";
import {
  ReductionProjectNotFoundError,
  ReductionProjectUnderReviewError,
} from "../errors.js";
import {
  calculateReductionProjectDisplayStatus,
  createReductionProjectSubmission,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";
import {
  ReductionProjectDisplayStatusEnum,
  ReductionProjectStatus,
} from "@repo/types";
import { mapReductionProjectToUpdateResponse } from "../mappers.js";

export const updateReductionProjectService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateReductionProjectRequest,
  user: User | null,
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<UpdateReductionProjectResponse> => {
  const { fileUuids, ...fields } = data;

  return prismaClient.$transaction(async (tx) => {
    const existing = await tx.reductionProject.findUnique({
      where: { id: BigInt(id), status: ReductionProjectStatus.ACTIVE },
      select: {
        ...reductionProjectWithSubmissionsMinimalSelect,
      },
    });

    if (!existing) {
      throw new ReductionProjectNotFoundError(id);
    }

    const displayStatus = calculateReductionProjectDisplayStatus(existing);

    if (displayStatus === ReductionProjectDisplayStatusEnum.SUBMITTED) {
      throw new ReductionProjectUnderReviewError();
    }

    const isDraft = displayStatus === ReductionProjectDisplayStatusEnum.DRAFT;

    if (isDraft) {
      if (fileUuids !== undefined && fileUuids.length > 0) {
        throw new FileAttachmentsNotSupportedError("draft");
      }
    } else {
      if (!fileUuids?.length) {
        throw new FileAttachmentsRequiredError();
      }
      if (!blobServiceClient || !containerName) {
        throw new StorageNotConfiguredError();
      }
    }

    const updateData: Prisma.ReductionProjectUncheckedUpdateInput = {};

    if (fields.name !== undefined) updateData.name = fields.name;
    const organizationId = mapBigIntField(fields.organizationId);
    if (organizationId !== undefined) {
      updateData.organizationId = organizationId;
    }
    const carbonInventoryId = mapBigIntField(fields.carbonInventoryId);
    if (carbonInventoryId !== undefined) {
      updateData.carbonInventoryId = carbonInventoryId;
    }
    if (fields.implementationDate !== undefined) {
      updateData.implementationDate = fields.implementationDate
        ? new Date(fields.implementationDate)
        : null;
    }
    if (fields.description !== undefined) {
      updateData.description = fields.description;
    }
    const subcategoryId = mapBigIntField(fields.subcategoryId);
    if (subcategoryId !== undefined) {
      updateData.subcategoryId = subcategoryId;
    }
    if (fields.gwpUsed !== undefined) updateData.gwpUsed = fields.gwpUsed;
    if (fields.useNationalGwp !== undefined) {
      updateData.useNationalGwp = fields.useNationalGwp;
    }
    if (fields.consideredGei !== undefined) {
      updateData.consideredGei = fields.consideredGei;
    }
    if (fields.reportedElsewhere !== undefined) {
      updateData.reportedElsewhere = fields.reportedElsewhere;
    }
    if (fields.reportedElsewhereDescription !== undefined) {
      updateData.reportedElsewhereDescription =
        fields.reportedElsewhereDescription;
    }
    if (fields.year !== undefined) updateData.year = fields.year;
    if (fields.baselineScenario !== undefined) {
      updateData.baselineScenario = fields.baselineScenario;
    }
    if (fields.projectScenario !== undefined) {
      updateData.projectScenario = fields.projectScenario;
    }

    let row;
    if (Object.keys(updateData).length > 0) {
      updateData.updatedById = user ? BigInt(user.id) : null;
      try {
        row = await tx.reductionProject.update({
          where: { id: BigInt(id) },
          data: updateData,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2025") {
            throw new ReductionProjectNotFoundError(id);
          }
        }
        throw error;
      }
    } else {
      row = await tx.reductionProject.findUnique({
        where: { id: BigInt(id) },
      });
      if (!row) {
        throw new ReductionProjectNotFoundError(id);
      }
    }

    if (!isDraft && fileUuids?.length) {
      const createdById = user ? BigInt(user.id) : null;
      const submissionId = await createReductionProjectSubmission(
        tx,
        BigInt(id),
        SubmissionType.REDUCTION_PROJECT_VERIFICATION,
        createdById
      );
      const { sourceCleanup } = await linkFilesToSubmission(
        tx,
        submissionId,
        fileUuids,
        blobServiceClient!,
        containerName!
      );
      await cleanupSourceBlobs(sourceCleanup);
    }

    return mapReductionProjectToUpdateResponse(row);
  });
};
