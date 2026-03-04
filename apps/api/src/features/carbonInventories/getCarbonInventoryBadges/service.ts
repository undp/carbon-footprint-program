import { PrismaClient, Prisma } from "@repo/database";
import {
  GetCarbonInventoryBadgesResponse,
  SubmissionStatus,
  InventoryStatus,
  BadgeType,
} from "@repo/types";
import { sortBy } from "lodash-es";
import { BlobServiceClient } from "@azure/storage-blob";
import { generateReadSasUrl } from "../../../services/index.js";
import { CarbonInventoryNotFoundError } from "../errors.js";

const BADGE_SORT_ORDER: Record<BadgeType, number> = {
  [BadgeType.CARBON_INVENTORY_CALCULATION]: 1,
  [BadgeType.CARBON_INVENTORY_VERIFICATION]: 2,
  [BadgeType.REDUCTION_PLAN_VERIFICATION]: 3,
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]: 4,
  [BadgeType.ORGANIZATION_ACCREDITATION]: 5,
};

export const getCarbonInventoryBadgesService = async (
  prismaClient: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  id: string
): Promise<GetCarbonInventoryBadgesResponse> => {
  const whereClause: Prisma.CarbonInventoryWhereUniqueInput = {
    id: BigInt(id),
    status: {
      in: [InventoryStatus.VERIFIED, InventoryStatus.SUBMITTED],
    },
    // THIS IS A SUBMISSION SUBJECT LINK, NOT A SUBMISSION
    submission: {
      subject: {
        submissions: {
          some: {
            status: SubmissionStatus.APPROVED,
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

  if (!carbonInventory) throw new CarbonInventoryNotFoundError(id);

  const badges = carbonInventory.submission?.subject.submissions
    .map((s) => s.badge)
    .filter((b) => b !== null);

  if (!badges || badges.length === 0) return [];

  const sortedBadged = sortBy(badges, ({ type }) => BADGE_SORT_ORDER[type]);

  return Promise.all(
    sortedBadged.map(async (badge) => {
      const file = badge.file;

      const { url: previewUrl } = await generateReadSasUrl(
        blobServiceClient,
        containerName,
        file.blobPath,
        { contentType: file.mimeType }
      );

      return {
        badgeType: badge.type,
        previewUrl,
      };
    })
  );
};
