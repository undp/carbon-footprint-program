import type { PrismaClient } from "@repo/database";
import { type GetAllCategoriesResponse } from "@repo/types";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
} from "./errors.js";
import { kgToTon } from "@/utils/number.js";

export type InventoryBase = {
  id: bigint;
  name: string | null;
  organizationData: unknown;
  methodologyVersionId: bigint;
};

export type CategoryData = Pick<
  GetAllCategoriesResponse[number],
  "id" | "name" | "synonyms" | "position"
> & {
  subtotal: number;
  subcategories: { id: string; name: string; subtotal: number }[];
};

export type InventoryWithCategoryData = {
  inventory: InventoryBase;
  categoryData: CategoryData[];
  totalEmissions: number;
};

/**
 * Fetches the carbon inventory and validates it exists and has a methodology.
 */
export async function fetchInventory(
  prismaClient: PrismaClient,
  id: string
): Promise<InventoryBase> {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      name: true,
      organizationData: true,
      methodologyVersionId: true,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  if (!inventory.methodologyVersionId) {
    throw new MethodologyNotFoundError(id);
  }

  return inventory as InventoryBase;
}

/**
 * Fetches the methodology categories/subcategories, subtotals from the DB view,
 * and builds category data with totals.
 */
export async function fetchCategoryData(
  prismaClient: PrismaClient,
  inventory: InventoryBase
): Promise<{ categoryData: CategoryData[]; totalEmissions: number }> {
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: { id: inventory.methodologyVersionId },
    select: {
      categories: {
        select: {
          id: true,
          name: true,
          synonyms: true,
          position: true,
          subcategories: {
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!methodology) {
    throw new MethodologyNotFoundError(inventory.id.toString());
  }

  const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
    where: { carbonInventoryId: inventory.id },
  });

  const subtotalMap = new Map<string, number>();
  for (const row of subtotals) {
    subtotalMap.set(row.subcategoryId.toString(), kgToTon(Number(row.value)));
  }

  const categoryData = methodology.categories.map((category) => {
    const subcategories = category.subcategories
      .map((sub) => ({
        id: sub.id.toString(),
        name: sub.name,
        subtotal: subtotalMap.get(sub.id.toString()) ?? 0,
      }))
      .filter((sub) => sub.subtotal > 0);

    const categorySubtotal = subcategories.reduce(
      (sum, sub) => sum + sub.subtotal,
      0
    );

    return {
      id: category.id.toString(),
      name: category.name,
      synonyms: category.synonyms,
      position: category.position,
      subtotal: categorySubtotal,
      subcategories,
    };
  });

  const totalEmissions = categoryData.reduce(
    (sum, cat) => sum + cat.subtotal,
    0
  );

  return { categoryData, totalEmissions };
}

/**
 * Convenience: fetches inventory + category data in one call.
 */
export async function fetchInventoryWithCategoryData(
  prismaClient: PrismaClient,
  id: string
): Promise<InventoryWithCategoryData> {
  const inventory = await fetchInventory(prismaClient, id);
  const { categoryData, totalEmissions } = await fetchCategoryData(
    prismaClient,
    inventory
  );
  return { inventory, categoryData, totalEmissions };
}
