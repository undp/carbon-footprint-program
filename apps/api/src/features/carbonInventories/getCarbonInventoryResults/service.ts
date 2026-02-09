import type { PrismaClient } from "@repo/database";
import type {
  GetCarbonInventoryResultsResponse,
  RankingSeverity,
} from "@repo/types";

type OrganizationData = {
  name?: string | null;
  sectorId?: string | null;
  subsectorId?: string | null;
  sizeId?: string | null;
  mainActivityId?: string | null;
  mainActivityQuantity?: number | null;
};

export type GetCarbonInventoryResultsResult =
  | { success: true; data: GetCarbonInventoryResultsResponse }
  | {
      success: false;
      error: "CARBON_INVENTORY_NOT_FOUND" | "METHODOLOGY_NOT_FOUND";
    };

/**
 * Distributes percentages using the largest remainder method so they sum to exactly 1.
 * Each percentage is rounded to 4 decimal places.
 */
function distributePercentages(values: number[], total: number): number[] {
  if (total === 0 || values.length === 0) {
    return values.map(() => 0);
  }

  const rawPercentages = values.map((v) => v / total);
  const truncated = rawPercentages.map((p) => Math.floor(p * 10000) / 10000);
  const remainders = rawPercentages.map(
    (p) => p * 10000 - Math.floor(p * 10000)
  );

  const currentSum = truncated.reduce((a, b) => a + b, 0);
  const diff = Math.round((1 - currentSum) * 10000);

  // Sort indices by remainder descending, and add 0.0001 to each until sum = 1
  const sorted = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < diff && i < sorted.length; i++) {
    truncated[sorted[i].index] += 0.0001;
  }

  return truncated.map((p) => Math.round(p * 10000) / 10000);
}

function getRankingSeverity(position: number): RankingSeverity {
  if (position === 1) return "HIGH";
  if (position <= 4) return "MEDIUM";
  return "LOW";
}

export const getCarbonInventoryResultsService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryResultsResult> => {
  // 1. Fetch the carbon inventory
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
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  if (!inventory.methodologyVersionId) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // 2. Fetch all categories and subcategories from the methodology
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
            select: {
              id: true,
              name: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!methodology) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // 3. Fetch subtotals from the database view
  const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
    where: { carbonInventoryId: BigInt(id) },
  });

  // Build a lookup map: subcategoryId -> value
  const subtotalMap = new Map<string, number>();
  for (const row of subtotals) {
    subtotalMap.set(row.subcategoryId.toString(), Number(row.value));
  }

  // 4. Build categories with subtotals, ensuring all methodology entities are present
  const categoryData = methodology.categories.map((category) => {
    const subcategories = category.subcategories.map((sub) => ({
      id: sub.id.toString(),
      name: sub.name,
      subtotal: subtotalMap.get(sub.id.toString()) ?? 0,
    }));

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

  // 5. Calculate category percentages (sum to 1 across the inventory)
  const categorySubtotals = categoryData.map((c) => c.subtotal);
  const categoryPercentages = distributePercentages(
    categorySubtotals,
    totalEmissions
  );

  // 6. Calculate subcategory percentages within each category (sum to 1 per category)
  const categories = categoryData.map((category, catIdx) => {
    const subSubtotals = category.subcategories.map((s) => s.subtotal);
    const subPercentages = distributePercentages(
      subSubtotals,
      category.subtotal
    );

    return {
      id: category.id,
      name: category.name,
      synonyms: category.synonyms,
      position: category.position,
      subtotal: category.subtotal,
      percentage: categoryPercentages[catIdx],
      subcategories: category.subcategories.map((sub, subIdx) => ({
        id: sub.id,
        name: sub.name,
        subtotal: sub.subtotal,
        percentage: subPercentages[subIdx],
      })),
    };
  });

  // 7. Build subcategories ranking (sorted descending by subtotal)
  const allSubcategories = categoryData.flatMap((category) =>
    category.subcategories.map((sub) => ({
      name: sub.name,
      categoryId: category.id,
      subtotal: sub.subtotal,
    }))
  );

  // Sort descending by subtotal
  const sorted = [...allSubcategories].sort((a, b) => b.subtotal - a.subtotal);

  // Calculate percentages for ranking (relative to total emissions)
  const rankingSubtotals = sorted.map((s) => s.subtotal);
  const rankingPercentages = distributePercentages(
    rankingSubtotals,
    totalEmissions
  );

  const rankingItems = sorted.map((item, idx) => ({
    position: idx + 1,
    name: item.name,
    categoryId: item.categoryId,
    subtotal: item.subtotal,
    percentage: rankingPercentages[idx],
    severity: getRankingSeverity(idx + 1),
  }));

  // Reuse own ranking for both own and sector
  const subcategoriesRanking = {
    own: rankingItems,
    sector: rankingItems,
  };

  // 8. Calculate mainActivityEquivalence
  const orgData = inventory.organizationData as OrganizationData | null;
  const mainActivityQuantity =
    typeof orgData?.mainActivityQuantity === "number"
      ? orgData.mainActivityQuantity
      : null;
  const mainActivityId = orgData?.mainActivityId ?? null;

  let mainActivityEquivalence: GetCarbonInventoryResultsResponse["mainActivityEquivalence"] =
    null;

  if (mainActivityQuantity && mainActivityQuantity > 0 && mainActivityId) {
    // Look up the main activity name
    const mainActivity = await prismaClient.organizationMainActivity.findUnique(
      {
        where: { id: BigInt(mainActivityId) },
        select: { name: true },
      }
    );

    const rate = totalEmissions / mainActivityQuantity;

    mainActivityEquivalence = {
      rate: Math.round(rate * 100) / 100,
      activityName: mainActivity?.name ?? "actividad principal",
    };
  }

  // 9. Build suggested reduction plan (placeholder - could be AI-generated in the future)
  const suggestedReductionPlan = {
    summary:
      "Reducir las emisiones de proceso y combustión, en línea con la Ley Marco de Cambio Climático y los objetivos globales del sector.",
    items: [
      "Optimizar procesos productivos para reducir emisiones directas.",
      "Mejorar la eficiencia energética en instalaciones y equipos.",
      "Aumentar el uso de energías renovables y combustibles alternativos.",
      "Reducir consumos eléctricos con equipos eficientes.",
      "Optimizar transportes internos y despachos para bajar uso de combustible.",
    ],
  };

  return {
    success: true,
    data: {
      carbonInventory: {
        id: inventory.id.toString(),
        name: inventory.name,
      },
      totalEmissions,
      categories,
      suggestedReductionPlan,
      subcategoriesRanking,
      mainActivityEquivalence,
    },
  };
};
