import {
  InventoryStatus,
  OrganizationStatus,
  PrismaClient,
} from "@repo/database";
import {
  BadgeType,
  SubmissionStatus,
  GetOrganizationBadgesResponse,
} from "@repo/types";

import { OrganizationNotFoundError } from "../../errors.js";
import { DataIntegrityError } from "@/errors/DataIntegrityError.js";
import { kgToTon } from "@repo/utils";

export const getOrganizationBadgesService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  year?: string,
  badgeTypes?: BadgeType[]
): Promise<GetOrganizationBadgesResponse> => {
  const org = await prismaClient.organization.findUnique({
    where: { id: BigInt(organizationId), status: OrganizationStatus.ACTIVE },
    select: { id: true },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const yearFilter = year ? parseInt(year, 10) : undefined;
  const badgeTypeFilter = badgeTypes?.length ? { in: badgeTypes } : undefined;

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
              ...(badgeTypeFilter && { badge: { type: badgeTypeFilter } }),
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
                  ...(badgeTypeFilter && { badge: { type: badgeTypeFilter } }),
                },
                select: {
                  id: true,
                  updatedAt: true,
                  badge: {
                    select: { type: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const result: GetOrganizationBadgesResponse = [];

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

    for (const submission of submissions) {
      if (!submission.badge) continue;

      result.push({
        submissionId: submission.id.toString(),
        earningDate: submission.updatedAt?.toISOString() ?? null,
        measurementYear: inventory.year,
        badgeType: submission.badge.type,
        totalEmissions,
      });
    }
  }

  return result;
};
