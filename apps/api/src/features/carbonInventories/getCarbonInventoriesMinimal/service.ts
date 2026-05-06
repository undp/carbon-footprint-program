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
      AND: [baseFilters, accessControlFilter],
    },
    select: {
      ...carbonInventoryWithSubmissionsMinimalSelect,
      organizationId: true,
      organization: {
        select: {
          summary: { select: { name: true } },
        },
      },
      name: true,
      year: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return data
    .map((inv) => ({
      id: inv.id.toString(),
      organizationId: inv.organizationId?.toString() ?? null,
      organizationName: inv.organization?.summary?.name ?? null,
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
