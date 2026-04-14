import {
  OrganizationRole,
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
import { mapBigIntField } from "@/utils/bigint.js";
import {
  createReductionProjectSubmission,
  validateReductionProjectPrerequisites,
} from "../helpers.js";

export const createReductionProjectService = async (
  prismaClient: PrismaClient,
  data: CreateReductionProjectRequest,
  user: User | null,
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<CreateReductionProjectResponse> => {
  const createdById = user?.id ? BigInt(user.id) : null;

  const result = await prismaClient.$transaction(async (tx) => {
    await validateReductionProjectPrerequisites(
      tx,
      data.organizationId,
      data.carbonInventoryId,
      createdById
    );

    // Create the reduction project record
    const project = await tx.reductionProject.create({
      data: {
        name: data.name,
        organizationId: mapBigIntField(data.organizationId),
        carbonInventoryId: mapBigIntField(data.carbonInventoryId),
        implementationDate: new Date(data.implementationDate),
        description: data.description,
        subcategoryId: mapBigIntField(data.subcategoryId),
        gwpUsed: data.gwpUsed,
        consideredGei: data.consideredGei,
        reportedElsewhere: data.reportedElsewhere,
        reportedElsewhereDescription: data.reportedElsewhereDescription,
        year: data.year,
        baselineScenario: data.baselineScenario,
        projectScenario: data.projectScenario,
        createdById,
        updatedAt: null,
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
