import { InventoryStatus, type PrismaClient, Prisma } from "@repo/database";
import { CarbonInventoryAvailableYearsResponse, User } from "@repo/types";
import { chain } from "lodash-es";

export const getAvailableYearsService = async (
  prismaClient: PrismaClient,
  _query: Record<string, unknown> | null,
  user: User | null
): Promise<CarbonInventoryAvailableYearsResponse> => {
  const whereClause: Prisma.CarbonInventoryWhereInput = {
    NOT: { status: InventoryStatus.DELETED },
    year: { not: null },
    createdById: user ? BigInt(user.id) : undefined,
  };

  const data = await prismaClient.carbonInventory.findMany({
    select: {
      year: true,
    },
    where: whereClause,
    distinct: ["year"],
    orderBy: {
      year: "desc",
    },
  });

  return chain(data)
    .map((inventory) => inventory.year!.toString())
    .value();
};
