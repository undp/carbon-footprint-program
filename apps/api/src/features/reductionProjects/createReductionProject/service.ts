import {
  InventoryStatus,
  OrganizationStatus,
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type {
  CreateReductionProjectRequest,
  CreateReductionProjectResponse,
  User,
} from "@repo/types";
import {
  linkFilesToSubmission,
  cleanupSourceBlobs,
} from "@/features/files/helpers/linkFilesToSubmission.js";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { mapBigIntField } from "@/utils/bigint.js";
import {
  ReductionProjectOrganizationNotAssociatedError,
  ReductionProjectOrganizationNotAccreditedError,
  ReductionProjectCarbonInventoryNotApprovedError,
} from "../errors.js";
import { createReductionProjectSubmission } from "../helpers.js";

export const createReductionProjectService = async (
  prismaClient: PrismaClient,
  data: CreateReductionProjectRequest,
  user: User | null,
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<CreateReductionProjectResponse> => {
  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  const createdById = user?.id ? BigInt(user.id) : null;

  const result = await prismaClient.$transaction(async (tx) => {
    // Validate organization association
    if (!data.organizationId) {
      throw new ReductionProjectOrganizationNotAssociatedError("new");
    }

    const organization = await tx.organization.findFirst({
      where: {
        id: BigInt(data.organizationId),
        status: OrganizationStatus.ACTIVE,
      },
      select: {
        summary: { select: { isAccredited: true } },
      },
    });

    if (!organization?.summary?.isAccredited) {
      throw new ReductionProjectOrganizationNotAccreditedError("new");
    }

    // Validate carbon inventory has an approved CARBON_INVENTORY_VERIFICATION submission
    if (!data.carbonInventoryId) {
      throw new ReductionProjectCarbonInventoryNotApprovedError();
    }

    const approvedInventory = await tx.carbonInventory.findFirst({
      where: {
        id: BigInt(data.carbonInventoryId),
        status: InventoryStatus.ACTIVE,
        submission: {
          subject: {
            submissions: {
              some: {
                type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
                status: SubmissionStatus.APPROVED,
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!approvedInventory) {
      throw new ReductionProjectCarbonInventoryNotApprovedError();
    }

    // Create the reduction project record
    const project = await tx.reductionProject.create({
      data: {
        createdById,
        updatedAt: null,
        name: data.name,
        organizationId: mapBigIntField(data.organizationId),
        carbonInventoryId: mapBigIntField(data.carbonInventoryId),
        implementationDate: data.implementationDate
          ? new Date(data.implementationDate)
          : null,
        description: data.description,
        subcategoryId: mapBigIntField(data.subcategoryId),
        gwpUsed: data.gwpUsed,
        useNationalGwp: data.useNationalGwp,
        consideredGei: data.consideredGei,
        reportedElsewhere: data.reportedElsewhere,
        reportedElsewhereDescription: data.reportedElsewhereDescription,
        year: data.year,
        baselineScenario: data.baselineScenario,
        projectScenario: data.projectScenario,
      },
    });

    // Create submission and link files atomically
    const submissionId = await createReductionProjectSubmission(
      tx,
      project.id,
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      createdById
    );

    const { sourceCleanup } = await linkFilesToSubmission(
      tx,
      submissionId,
      data.fileUuids,
      blobServiceClient,
      containerName
    );

    return { id: project.id.toString(), sourceCleanup };
  });

  // Cleanup source blobs after the transaction commits
  await cleanupSourceBlobs(result.sourceCleanup);

  return { id: result.id };
};
