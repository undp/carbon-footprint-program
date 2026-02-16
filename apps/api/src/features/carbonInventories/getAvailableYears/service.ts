import { InventoryStatus, type PrismaClient } from "@repo/database";
import { CarbonInventoryAvailableYearsResponse, User } from "@repo/types";
import { chain } from "lodash-es";

export const getAvailableYearsService = async (
  prismaClient: PrismaClient,
  _query?: Record<string, unknown>,
  user?: User | null
): Promise<CarbonInventoryAvailableYearsResponse> => {
  const whereClause: {
    createdById?: bigint;
  } = {};

  whereClause.createdById = user ? BigInt(user.id) : undefined;

  const data = await prismaClient.carbonInventory.findMany({
    select: {
      year: true,
    },
    where: {
      NOT: { status: InventoryStatus.DELETED },
      year: { not: null },
      ...whereClause,
    },
    distinct: ["year"],
    orderBy: {
      year: "desc",
    },
  });

  return chain(data)
    .map((inventory) => inventory.year!.toString())
    .value();
};
