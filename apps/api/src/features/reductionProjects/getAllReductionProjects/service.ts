import {
  type Prisma,
  type PrismaClient,
  MembershipStatus,
} from "@repo/database";
import type {
  GetAllReductionProjectsQuery,
  GetAllReductionProjectsResponse,
  User,
} from "@repo/types";
import { ReductionProjectStatus } from "@repo/types";
import { mapReductionProjectToListItem } from "../mappers.js";
import {
  calculateReductionProjectDisplayStatus,
  reductionProjectSubmissionFilter,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";

export const getAllReductionProjectsService = async (
  prismaClient: PrismaClient,
  query: GetAllReductionProjectsQuery | null,
  user: User | null
): Promise<GetAllReductionProjectsResponse> => {
  const baseFilters: Prisma.ReductionProjectWhereInput = {
    status: ReductionProjectStatus.ACTIVE,
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

  const data = await prismaClient.reductionProject.findMany({
    where: {
      AND: [baseFilters, accessControlFilter, reductionProjectSubmissionFilter],
    },
    select: {
      ...reductionProjectWithSubmissionsMinimalSelect,
      name: true,
      year: true,
      createdAt: true,
      baselineScenario: true,
      projectScenario: true,
      organization: {
        select: {
          summary: {
            select: {
              name: true,
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
