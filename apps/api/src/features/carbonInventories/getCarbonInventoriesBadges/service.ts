import { type PrismaClient, Prisma } from "@repo/database";
import {
  GetCarbonInventoryBadgesResponse,
  SubmissionStatus,
  InventoryStatus,
} from "@repo/types";

import { BlobServiceClient } from "@azure/storage-blob";
import { generateReadSasUrl } from "../../../services/index.js";

export const getCarbonInventoryBadgesService = async (
  prismaClient: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  id: string
): Promise<GetCarbonInventoryBadgesResponse> => {
  const whereClause: Prisma.CarbonInventoryWhereInput = {
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
          },
        },
      },
    },
  };

  const data = await prismaClient.carbonInventory.findMany({
    include: {
      // THIS IS A SUBMISSION SUBJECT LINK, NOT A SUBMISSION
      submission: {
        select: {
          subjectId: true,
        },
        include: {
          subject: {
            select: {
              subjectType: true,
              submissions: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
                include: {
                  badge: {
                    include: {
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

  const response = await Promise.all(
    data.map(async ({ submission: submissionLink }) => {
      if (!submissionLink?.subject) {
        // console.warn(
        //   `No submissionLink found for carbon inventory with id ${id}`
        // );
        return null;
      }

      const subjectType = submissionLink.subject.subjectType;

      const file = submissionLink.subject.submissions[0].badge?.file;

      if (!file) {
        // console.warn(
        //   `No badge file found for carbon inventory with id ${id} and submission id ${submissionLink?.subjectId}`
        // );
        return null;
      }

      const { url: previewUrl } = await generateReadSasUrl(
        blobServiceClient,
        containerName,
        file.blobPath,
        { contentType: file.mimeType }
      );

      return {
        subjectType,
        previewUrl,
      };
    })
  );

  return response.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );
};
