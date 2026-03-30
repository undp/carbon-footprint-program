import {
  MembershipStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import {
  type GetCarbonInventoriesMinimalResponse,
  type User,
  CarbonInventoryDisplayStatus,
  InventoryStatus,
} from "@repo/types";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
} from "../helpers.js";

export const getCarbonInventoriesMinimalService = async (
  prismaClient: PrismaClient,
  query: Record<string, unknown> | null,
  user: User | null
): Promise<GetCarbonInventoriesMinimalResponse> => {
  // TODO: refactor user usage when FastifyRequest is improved for authenticated requests
  const baseFilters: Prisma.CarbonInventoryWhereInput = {
    status: InventoryStatus.ACTIVE,
  };

  const selfDeclaredFilter: Prisma.CarbonInventoryWhereInput =
    query?.selfDeclared !== undefined
      ? {
          isSelfDeclared: query.selfDeclared === "true",
        }
      : {};

  const accessControlFilter: Prisma.CarbonInventoryWhereInput = user
    ? {
        OR: [
          // User created the inventory
          {
            createdById: BigInt(user.id),
          },
          // Inventory belongs to organization where user has active membership
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

  const data = await prismaClient.carbonInventory.findMany({
    where: {
      AND: [baseFilters, accessControlFilter, selfDeclaredFilter],
    },
    select: {
      ...carbonInventoryWithSubmissionsMinimalSelect,
      name: true,
      year: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return data
    .map((inv) => ({
      id: inv.id.toString(),
      name: inv.name,
      year: inv.year,
      status: calculateDisplayStatus(inv),
    }))
    .filter(
      ({ status }) =>
        !query?.statuses ||
        (query.statuses as CarbonInventoryDisplayStatus[]).includes(status)
    );
};
