import { PrismaClient, Prisma } from "@repo/database";
import {
  GetCarbonInventoryBadgesResponse,
  SubmissionStatus,
  BadgeType,
  ReductionProjectStatus,
} from "@repo/types";
import { sortBy } from "lodash-es";
import type { StorageAdapter } from "@repo/storage";

const BADGE_SORT_ORDER: Record<BadgeType, number> = {
  [BadgeType.CARBON_INVENTORY_CALCULATION]: 1,
  [BadgeType.CARBON_INVENTORY_VERIFICATION]: 2,
  [BadgeType.REDUCTION_PROJECT_VERIFICATION]: 3,
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]: 4,
  [BadgeType.ORGANIZATION_ACCREDITATION]: 5,
};

export const getCarbonInventoryBadgesService = async (
  prismaClient: PrismaClient,
  storage: StorageAdapter,
  id: string
): Promise<GetCarbonInventoryBadgesResponse> => {
  const whereClause: Prisma.CarbonInventoryWhereUniqueInput = {
    id: BigInt(id),
    // THIS IS A SUBMISSION SUBJECT LINK, NOT A SUBMISSION
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
            badge: {
              type: {
                not: BadgeType.ORGANIZATION_ACCREDITATION, // Exclude organization data badges
              },
            },
          },
        },
      },
    },
  };

  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    include: {
      // THIS IS A SUBMISSION SUBJECT LINK, NOT A SUBMISSION
      submission: {
        select: {
          subject: {
            select: {
              submissions: {
                select: {
                  badge: {
                    select: {
                      type: true,
                      file: {
                        select: {
                          blobPath: true,
                          mimeType: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    where: whereClause,
  });

  if (!carbonInventory) return [];

  const reductionProjects = await prismaClient.reductionProject.findMany({
    where: {
      carbonInventoryId: BigInt(id),
      status: ReductionProjectStatus.ACTIVE,
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
            },
          },
        },
      },
    },
    select: {
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
                },
                select: {
                  badge: {
                    select: {
                      type: true,
                      file: {
                        select: {
                          blobPath: true,
                          mimeType: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const inventoryBadges =
    carbonInventory.submission?.subject.submissions
      .map((s) => s.badge)
      .filter((b) => b !== null) ?? [];

  const reductionBadges = reductionProjects.flatMap(
    (p) =>
      p.submission?.subject.submissions
        .map((s) => s.badge)
        .filter((b) => b !== null) ?? []
  );

  const badges = [...inventoryBadges, ...reductionBadges].filter(
    (b) => b.type !== BadgeType.ORGANIZATION_ACCREDITATION
  );

  if (badges.length === 0) return [];

  const sortedBadged = sortBy(badges, ({ type }) => BADGE_SORT_ORDER[type]);

  return Promise.all(
    sortedBadged.map(async (badge) => {
      const file = badge.file;

      const { url: previewUrl } = await storage.generateReadUrl(file.blobPath, {
        contentType: file.mimeType,
      });

      return {
        badgeType: badge.type,
        previewUrl,
      };
    })
  );
};
