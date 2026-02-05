import { InventoryStatus, type PrismaClient } from "@repo/database";
import { CarbonInventoryAvailableYearsResponse } from "@repo/types";
import { chain } from "lodash-es";

export const getAvailableYearsService = async (
  prismaClient: PrismaClient
): Promise<CarbonInventoryAvailableYearsResponse> => {
  const data = await prismaClient.carbonInventory.findMany({
    select: {
      year: true,
    },
    where: {
      NOT: { status: InventoryStatus.DELETED },
      year: { not: null },
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
