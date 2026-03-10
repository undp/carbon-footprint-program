import { type Prisma, type PrismaClient } from "@repo/database";
import {
  type GetCarbonInventoriesMinimalResponse,
  type User,
  type CarbonInventoryDisplayStatus,
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
  const whereClause: Prisma.CarbonInventoryWhereInput = {
    status: { not: InventoryStatus.DELETED },
    createdById: user ? BigInt(user.id) : undefined,
  };

  const data = await prismaClient.carbonInventory.findMany({
    where: whereClause,
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
      status: calculateDisplayStatus(
        inv as unknown as Parameters<typeof calculateDisplayStatus>[0]
      ),
    }))
    .filter(
      ({ status }) =>
        !query?.statuses ||
        (query.statuses as CarbonInventoryDisplayStatus[]).includes(status)
    );
};
