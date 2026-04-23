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
  ReductionProjectStatus,
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

import { mapApprovedSubmissionsToRecognitions } from "./helpers.js";
import { Prisma } from "@repo/database";

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

  const includeCarbonInventories =
    !submissionTypes?.length ||
    submissionTypes.includes(SubmissionType.CARBON_INVENTORY_CALCULATION) ||
    submissionTypes.includes(SubmissionType.CARBON_INVENTORY_VERIFICATION);

  const result: GetOrganizationRecognitionsResponse = [];

  if (includeCarbonInventories) {
    const carbonInventoryTypes = [
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
    ] as const;

    const carbonInventorySubmissionTypes = submissionTypes
      ? carbonInventoryTypes.filter((t) => submissionTypes.includes(t))
      : [...carbonInventoryTypes];

    const carbonInventorySubmissionTypeFilter: Prisma.SubmissionWhereInput = {
      type: { in: carbonInventorySubmissionTypes },
    };

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
                ...carbonInventorySubmissionTypeFilter,
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
                    ...carbonInventorySubmissionTypeFilter,
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

      const items = await mapApprovedSubmissionsToRecognitions(
        submissions,
        inventory.year,
        totalEmissions,
        blobServiceClient,
        containerName
      );

      result.push(...items);
    }
  }

  const includeReductionProjects =
    !submissionTypes?.length ||
    submissionTypes.includes(SubmissionType.REDUCTION_PROJECT_VERIFICATION);

  if (includeReductionProjects) {
    const reductionSubmissionTypeFilter = {
      in: [SubmissionType.REDUCTION_PROJECT_VERIFICATION],
    };

    const reductionProjects = await prismaClient.reductionProject.findMany({
      where: {
        organizationId: BigInt(organizationId),
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
                type: reductionSubmissionTypeFilter,
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
                    type: reductionSubmissionTypeFilter,
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

    for (const project of reductionProjects) {
      const submissions = project.submission?.subject.submissions ?? [];
      if (submissions.length === 0) continue;

      const items = await mapApprovedSubmissionsToRecognitions(
        submissions,
        project.year,
        null,
        blobServiceClient,
        containerName
      );

      result.push(...items);
    }
  }

  return result.sort(
    (a, b) =>
      b.measurementYear - a.measurementYear ||
      SUBMISSION_TYPE_ORDER[b.submissionType] -
        SUBMISSION_TYPE_ORDER[a.submissionType]
  );
};
