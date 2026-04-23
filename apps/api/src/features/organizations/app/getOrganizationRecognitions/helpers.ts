import { BlobServiceClient } from "@azure/storage-blob";
import {
  InventoryStatus,
  PrismaClient,
  SubmissionFileType,
} from "@repo/database";
import {
  GetOrganizationRecognitionsResponse,
  ReductionProjectStatus,
  SubmissionStatus,
  SubmissionType,
} from "@repo/types";
import { kgToTon } from "@repo/utils";

import { DataIntegrityError } from "@/errors/DataIntegrityError.js";
import { generateReadSasUrl } from "@/services/index.js";

type SubmissionForRecognition = {
  id: bigint;
  type: SubmissionType;
  updatedAt: Date | null;
  files: {
    file: { blobPath: string | null; mimeType: string | null } | null;
  }[];
};

type MapApprovedSubmissionsToRecognitionsParams = {
  submissions: SubmissionForRecognition[];
  measurementYear: number;
  totalEmissions: number | null;
  blobServiceClient: BlobServiceClient | null | undefined;
  containerName: string | null | undefined;
};

type BlobConfig = {
  blobServiceClient: BlobServiceClient | null | undefined;
  containerName: string | null | undefined;
};

export const mapApprovedSubmissionsToRecognitions = async ({
  submissions,
  measurementYear,
  totalEmissions,
  blobServiceClient,
  containerName,
}: MapApprovedSubmissionsToRecognitionsParams) =>
  Promise.all(
    submissions.map(async (submission) => {
      const recognitionFile = submission.files[0]?.file;
      let recognitionFileUrl: string | null = null;

      if (recognitionFile?.blobPath && blobServiceClient && containerName) {
        const { url } = await generateReadSasUrl(
          blobServiceClient,
          containerName,
          recognitionFile.blobPath,
          { contentType: recognitionFile.mimeType ?? undefined }
        );
        recognitionFileUrl = url;
      }

      return {
        submissionId: submission.id.toString(),
        earningDate: submission.updatedAt?.toISOString() ?? null,
        measurementYear,
        submissionType: submission.type,
        totalEmissions,
        recognitionFileUrl,
      };
    })
  );

export const fetchCarbonInventoryRecognitions = async (
  prismaClient: PrismaClient,
  organizationId: bigint,
  yearFilter: number | undefined,
  requestedSubmissionTypes: SubmissionType[],
  blobConfig: BlobConfig
): Promise<GetOrganizationRecognitionsResponse> => {
  if (!requestedSubmissionTypes.length) return [];

  const inventories = await prismaClient.carbonInventory.findMany({
    where: {
      organizationId,
      ...(yearFilter !== undefined ? { year: yearFilter } : {}),
      status: InventoryStatus.ACTIVE,
      submission: {
        subject: {
          submissions: {
            some: {
              status: {
                in: [
                  SubmissionStatus.APPROVED,
                  SubmissionStatus.APPROVED_AUTOMATICALLY,
                ],
              },
              type: { in: requestedSubmissionTypes },
            },
          },
        },
      },
    },
    include: {
      subtotals: true,
      submission: {
        select: {
          subject: {
            select: {
              submissions: {
                where: {
                  status: {
                    in: [
                      SubmissionStatus.APPROVED,
                      SubmissionStatus.APPROVED_AUTOMATICALLY,
                    ],
                  },
                  type: { in: requestedSubmissionTypes },
                },
                select: {
                  id: true,
                  type: true,
                  updatedAt: true,
                  files: {
                    where: { type: SubmissionFileType.RECOGNITION },
                    select: {
                      file: { select: { blobPath: true, mimeType: true } },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const recognitionsByInventory = await Promise.all(
    inventories.map(async (inventory) => {
      const submissions = inventory.submission?.subject.submissions ?? [];
      if (submissions.length === 0) return [];

      if (inventory.year === null) {
        throw new DataIntegrityError(
          `Carbon inventory ${inventory.id} has no year, but has approved submissions. This should not happen. Please investigate the data integrity of this inventory.`
        );
      }

      const totalEmissions = inventory.subtotals.reduce(
        (sum, row) => sum + kgToTon(Number(row.value)),
        0
      );

      return mapApprovedSubmissionsToRecognitions({
        submissions,
        measurementYear: inventory.year,
        totalEmissions,
        ...blobConfig,
      });
    })
  );

  return recognitionsByInventory.flat();
};

export const fetchReductionProjectRecognitions = async (
  prismaClient: PrismaClient,
  organizationId: bigint,
  yearFilter: number | undefined,
  requestedSubmissionTypes: SubmissionType[],
  blobConfig: BlobConfig
): Promise<GetOrganizationRecognitionsResponse> => {
  if (!requestedSubmissionTypes.length) return [];

  const reductionProjects = await prismaClient.reductionProject.findMany({
    where: {
      organizationId,
      status: ReductionProjectStatus.ACTIVE,
      ...(yearFilter !== undefined ? { year: yearFilter } : {}),
      submission: {
        subject: {
          submissions: {
            some: {
              status: {
                in: [
                  SubmissionStatus.APPROVED,
                  SubmissionStatus.APPROVED_AUTOMATICALLY,
                ],
              },
              type: { in: requestedSubmissionTypes },
            },
          },
        },
      },
    },
    select: {
      year: true,
      submission: {
        select: {
          subject: {
            select: {
              submissions: {
                where: {
                  status: {
                    in: [
                      SubmissionStatus.APPROVED,
                      SubmissionStatus.APPROVED_AUTOMATICALLY,
                    ],
                  },
                  type: { in: requestedSubmissionTypes },
                },
                select: {
                  id: true,
                  type: true,
                  updatedAt: true,
                  files: {
                    where: { type: SubmissionFileType.RECOGNITION },
                    select: {
                      file: {
                        select: { blobPath: true, mimeType: true },
                      },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const recognitionsByProject = await Promise.all(
    reductionProjects.map(async (project) => {
      const submissions = project.submission?.subject.submissions ?? [];
      if (submissions.length === 0) return [];

      return mapApprovedSubmissionsToRecognitions({
        submissions,
        measurementYear: project.year,
        totalEmissions: null,
        ...blobConfig,
      });
    })
  );

  return recognitionsByProject.flat();
};
