import {
  SubmissionType,
  type Prisma,
  type PrismaClient,
  MembershipStatus,
} from "@repo/database";
import type {
  GetAllReductionProjectsQuery,
  GetAllReductionProjectsResponse,
  User,
} from "@repo/types";
import { InventoryStatus } from "@repo/types";
import { mapReductionProjectToListItem } from "../mappers.js";
import { calculateReductionProjectDisplayStatus } from "../helpers.js";

export const getAllReductionProjectsService = async (
  prismaClient: PrismaClient,
  query: GetAllReductionProjectsQuery | null,
  user: User | null
): Promise<GetAllReductionProjectsResponse> => {
  const baseFilters: Prisma.ReductionProjectWhereInput = {
    status: InventoryStatus.ACTIVE,
  };

  if (query?.year) {
    baseFilters.year = parseInt(query.year, 10);
  }

  if (query?.organizationId) {
    baseFilters.organizationId = BigInt(query.organizationId);
  }

  const accessControlFilter: Prisma.ReductionProjectWhereInput = user
    ? {
        OR: [
          { createdById: BigInt(user.id) },
          {
            organization: {
              memberships: {
                some: {
                  userId: BigInt(user.id),
                  status: MembershipStatus.ACTIVE,
                },
              },
            },
          },
        ],
      }
    : {};

  const submissionFilter: Prisma.ReductionProjectWhereInput = {
    OR: [
      { submission: { is: null } },
      {
        submission: {
          subject: {
            submissions: {
              some: {
                type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
              },
            },
          },
        },
      },
    ],
  };

  const data = await prismaClient.reductionProject.findMany({
    where: {
      AND: [baseFilters, accessControlFilter, submissionFilter],
    },
    include: {
      organization: {
        include: {
          summary: {
            select: {
              name: true,
            },
          },
        },
      },
      submission: {
        include: {
          subject: {
            include: {
              submissions: {
                select: {
                  id: true,
                  status: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return data.map((row) =>
    mapReductionProjectToListItem(
      row,
      calculateReductionProjectDisplayStatus(row)
    )
  );
};
