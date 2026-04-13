import {
  InventoryStatus,
  OrganizationStatus,
  PrismaClient,
  SubmissionFileType,
} from "@repo/database";
import {
  SubmissionType,
  SubmissionStatus,
  GetOrganizationRecognitionsResponse,
} from "@repo/types";
import { BlobServiceClient } from "@azure/storage-blob";

import { OrganizationNotFoundError } from "../../errors.js";

const SUBMISSION_TYPE_ORDER: Record<SubmissionType, number> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: 0,
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: 1,
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: 2,
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: 3,
  [SubmissionType.ORGANIZATION_ACCREDITATION]: 4,
};
import { DataIntegrityError } from "@/errors/DataIntegrityError.js";
import { kgToTon } from "@repo/utils";
import { generateReadSasUrl } from "@/services/index.js";

export const getOrganizationRecognitionsService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  year?: string,
  submissionTypes?: SubmissionType[],
  blobServiceClient?: BlobServiceClient | null,
  containerName?: string | null
): Promise<GetOrganizationRecognitionsResponse> => {
  const org = await prismaClient.organization.findUnique({
    where: { id: BigInt(organizationId), status: OrganizationStatus.ACTIVE },
    select: { id: true },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const yearFilter = year ? parseInt(year, 10) : undefined;
  const submissionTypeFilter = submissionTypes?.length
    ? { in: submissionTypes }
    : undefined;

  const inventories = await prismaClient.carbonInventory.findMany({
    where: {
      organizationId: BigInt(organizationId),
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
              ...(submissionTypeFilter && { type: submissionTypeFilter }),
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
                  ...(submissionTypeFilter && { type: submissionTypeFilter }),
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

  const result: GetOrganizationRecognitionsResponse = [];

  for (const inventory of inventories) {
    const submissions = inventory.submission?.subject.submissions ?? [];
    if (submissions.length === 0) continue;

    if (inventory.year === null) {
      throw new DataIntegrityError(
        `Carbon inventory ${inventory.id} has no year, but has approved submissions. This should not happen. Please investigate the data integrity of this inventory.`
      );
    }

    const subtotals = inventory.subtotals;

    const totalEmissions = subtotals.reduce(
      (sum, row) => sum + kgToTon(Number(row.value)),
      0
    );

    const items = await Promise.all(
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
          measurementYear: inventory.year!,
          submissionType: submission.type,
          totalEmissions,
          recognitionFileUrl,
        };
      })
    );

    result.push(...items);
  }

  return result.sort(
    (a, b) =>
      b.measurementYear - a.measurementYear ||
      SUBMISSION_TYPE_ORDER[b.submissionType] -
        SUBMISSION_TYPE_ORDER[a.submissionType]
  );
};
