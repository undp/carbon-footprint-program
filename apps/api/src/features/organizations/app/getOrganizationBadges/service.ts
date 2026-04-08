import { PrismaClient } from "@repo/database";
import {
  BadgeType,
  SubmissionStatus,
  GetOrganizationBadgesResponse,
} from "@repo/types";

import { OrganizationNotFoundError } from "../../errors.js";

const kgToTon = (kg: number) => kg / 1000;

export const getOrganizationBadgesService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  year?: string
): Promise<GetOrganizationBadgesResponse> => {
  const org = await prismaClient.organization.findUnique({
    where: { id: BigInt(organizationId) },
    select: { id: true },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const yearFilter = year ? parseInt(year, 10) : undefined;

  const inventories = await prismaClient.carbonInventory.findMany({
    where: {
      organizationId: BigInt(organizationId),
      ...(yearFilter !== undefined ? { year: yearFilter } : {}),
      submission: {
        subject: {
          submissions: {
            some: {
              status: SubmissionStatus.APPROVED,
              badge: {
                type: { not: BadgeType.ORGANIZATION_ACCREDITATION },
              },
            },
          },
        },
      },
    },
    include: {
      submission: {
        select: {
          subject: {
            select: {
              submissions: {
                where: {
                  status: SubmissionStatus.APPROVED,
                  badge: {
                    type: { not: BadgeType.ORGANIZATION_ACCREDITATION },
                  },
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

    const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
      where: { carbonInventoryId: inventory.id },
    });

    const totalEmissions = subtotals.reduce(
      (sum, row) => sum + kgToTon(Number(row.value)),
      0
    );

    for (const submission of submissions) {
      if (!submission.badge) continue;

      result.push({
        submissionId: submission.id.toString(),
        earningDate:
          submission.updatedAt?.toISOString() ?? new Date().toISOString(),
        measurementYear: inventory.year ?? 0,
        badgeType: submission.badge.type,
        totalEmissions,
      });
    }
  }

  return result;
};
