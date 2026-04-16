import type { PrismaClient } from "@repo/database";
import { CategoryStatus, InventoryStatus, Prisma } from "@repo/database";
import type { GetAdminDashboardCategoryChartResponse } from "@repo/types";

export const getDashboardCategoryChartService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetAdminDashboardCategoryChartResponse> => {
  const inventoryFilter: Prisma.CarbonInventoryWhereInput = {
    status: InventoryStatus.ACTIVE,
    isSelfDeclared: true,
    ...(year ? { year } : {}),
  };

  const methodologyVersions = await prismaClient.methodologyVersion.findMany({
    where: {
      carbonInventories: { some: inventoryFilter },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      categories: {
        where: { status: CategoryStatus.ACTIVE },
        select: { id: true, name: true, position: true },
        orderBy: { position: "asc" },
      },
      carbonInventories: {
        where: inventoryFilter,
        select: {
          subtotals: {
            select: { categoryId: true, value: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (methodologyVersions.length === 0) {
    return { methodologies: [] };
  }

  const methodologies = methodologyVersions.map((mv) => {
    const emissionsMap = new Map<string, number>();
    for (const inv of mv.carbonInventories) {
      for (const subtotal of inv.subtotals) {
        const key = String(subtotal.categoryId);
        emissionsMap.set(
          key,
          (emissionsMap.get(key) ?? 0) + Number(subtotal.value)
        );
      }
    }

    return {
      methodologyVersionId: Number(mv.id),
      methodologyVersionName: mv.name,
      categoryEmissions: mv.categories.map((cat) => ({
        categoryName: cat.name,
        totalEmissions: emissionsMap.get(String(cat.id)) ?? 0,
      })),
    };
  });

  return { methodologies };
};
