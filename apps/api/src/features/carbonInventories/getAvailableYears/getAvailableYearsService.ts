import { InventoryStatus, type PrismaClient } from "@repo/database";
import { CarbonInventoryAvailableYearsResponse } from "@repo/types";

export const getAvailableYearsService = async (
  prismaClient: PrismaClient
): Promise<CarbonInventoryAvailableYearsResponse> => {
  const data = await prismaClient.carbonInventory.findMany({
    select: {
      year: true,
    },
    where: {
      NOT: { status: InventoryStatus.DELETED },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (data.length === 0) {
    return [];
  }

  const years = new Set<string>();

  data.forEach((inventory) => {
    if (inventory.year) years.add(inventory.year.toString());
  });

  return Array.from(years);
};
