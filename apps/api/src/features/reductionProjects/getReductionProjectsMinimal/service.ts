import {
  MembershipStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import type {
  GetReductionProjectsMinimalParams,
  GetReductionProjectsMinimalResponse,
  User,
} from "@repo/types";
import { InventoryStatus } from "@repo/types";
import {
  calculateReductionProjectDisplayStatus,
  reductionProjectWithSubmissionsMinimalSelect,
} from "../helpers.js";
import { mapReductionProjectToMinimalItem } from "../mappers.js";

export const getReductionProjectsMinimalService = async (
  prismaClient: PrismaClient,
  query: GetReductionProjectsMinimalParams | null,
  user: User | null
): Promise<GetReductionProjectsMinimalResponse> => {
  const baseFilters: Prisma.ReductionProjectWhereInput = {
    status: InventoryStatus.ACTIVE,
  };

  if (query?.year) {
    baseFilters.year = parseInt(query.year, 10);
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
      AND: [baseFilters, accessControlFilter],
    },
    select: {
      ...reductionProjectWithSubmissionsMinimalSelect,
      organizationId: true,
      name: true,
      year: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return data.map((row) =>
    mapReductionProjectToMinimalItem(
      row,
      calculateReductionProjectDisplayStatus(row)
    )
  );
};
