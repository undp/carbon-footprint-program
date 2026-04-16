import type { PrismaClient } from "@repo/database";
import { CategoryStatus, InventoryStatus } from "@repo/database";
import type { GetAdminDashboardCategoryChartResponse } from "@repo/types";

export const getDashboardCategoryChartService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetAdminDashboardCategoryChartResponse> => {
  const inventoryFilter = {
    status: InventoryStatus.ACTIVE,
    isSelfDeclared: true,
    ...(year ? { year } : {}),
  };

  // Find all ACTIVE self-declared inventories matching the filters, with their methodology versions
  const inventories = await prismaClient.carbonInventory.findMany({
    where: inventoryFilter,
    select: {
      id: true,
      methodologyVersionId: true,
    },
  });

  if (inventories.length === 0) {
    return { methodologies: [] };
  }

  // Get unique methodology version IDs from these inventories (exclude null)
  const methodologyVersionIds = [
    ...new Set(
      inventories
        .map((inv) => inv.methodologyVersionId)
        .filter((id): id is bigint => id !== null)
    ),
  ];

  if (methodologyVersionIds.length === 0) {
    return { methodologies: [] };
  }

  // Get methodology versions sorted descending by createdAt (newest first)
  const methodologyVersions = await prismaClient.methodologyVersion.findMany({
    where: {
      id: { in: methodologyVersionIds },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      categories: {
        where: { status: CategoryStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          position: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (methodologyVersions.length === 0) {
    return { methodologies: [] };
  }

  // Get all subtotals for the matching inventories
  const inventoryIds = inventories.map((inv) => inv.id);
  const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
    where: {
      carbonInventoryId: { in: inventoryIds },
    },
    select: {
      carbonInventoryId: true,
      categoryId: true,
      value: true,
    },
  });

  // Build a map: inventoryId -> methodologyVersionId
  const inventoryMethodologyMap = new Map<bigint, bigint | null>();
  for (const inv of inventories) {
    inventoryMethodologyMap.set(inv.id, inv.methodologyVersionId);
  }

  // Build a map: (methodologyVersionId, categoryId) -> total emissions
  const emissionsKey = (mvId: bigint, catId: bigint) => `${mvId}:${catId}`;
  const emissionsMap = new Map<string, number>();

  for (const subtotal of subtotals) {
    const methodologyVersionId = inventoryMethodologyMap.get(
      subtotal.carbonInventoryId
    );
    if (!methodologyVersionId) continue;

    const key = emissionsKey(methodologyVersionId, subtotal.categoryId);
    emissionsMap.set(key, (emissionsMap.get(key) ?? 0) + Number(subtotal.value));
  }

  // Build the response
  const methodologies = methodologyVersions.map((mv) => ({
    methodologyVersionId: Number(mv.id),
    methodologyVersionName: mv.name,
    categoryEmissions: mv.categories.map((cat) => ({
      categoryName: cat.name,
      totalEmissions:
        emissionsMap.get(emissionsKey(mv.id, cat.id)) ?? 0,
    })),
  }));

  return { methodologies };
};
