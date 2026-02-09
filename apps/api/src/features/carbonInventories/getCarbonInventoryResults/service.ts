import type { PrismaClient } from "@repo/database";
import type {
  GetCarbonInventoryResultsResponse,
  OrganizationData,
} from "@repo/types";
import {
  distributePercentages,
  getRankingSeverity,
  roundEmissions,
} from "./helpers.js";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
} from "../errors.js";

export const getCarbonInventoryResultsService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryResultsResponse> => {
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
    throw new CarbonInventoryNotFoundError(id);
  }

  if (!inventory.methodologyVersionId) {
    throw new MethodologyNotFoundError(id);
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
    throw new MethodologyNotFoundError(id);
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

  // 4. Build categories with subtotals, keeping only entities with emissions
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
      subtotal: roundEmissions(category.subtotal),
      percentage: categoryPercentages[catIdx],
      subcategories: category.subcategories.map((sub, subIdx) => ({
        id: sub.id,
        name: sub.name,
        subtotal: roundEmissions(sub.subtotal),
        percentage: subPercentages[subIdx],
      })),
    };
  });

  // 7. Build subcategories ranking (sorted descending by subtotal,
  //    ties broken by category position asc, then name alphabetically)
  const allSubcategories = categoryData.flatMap((category) =>
    category.subcategories.map((sub) => ({
      name: sub.name,
      categoryId: category.id,
      categoryPosition: category.position,
      subtotal: sub.subtotal,
    }))
  );

  const sorted = [...allSubcategories].sort(
    (a, b) =>
      b.subtotal - a.subtotal ||
      a.categoryPosition - b.categoryPosition ||
      a.name.localeCompare(b.name)
  );

  // Calculate percentages for ranking (relative to total emissions)
  const rankingSubtotals = sorted.map((s) => s.subtotal);
  const rankingPercentages = distributePercentages(
    rankingSubtotals,
    totalEmissions
  );

  // Standard competition ranking: tied items share the same position,
  // next position after a tie skips (e.g. 1, 2, 2, 4)
  const positions: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    positions.push(
      i > 0 && sorted[i].subtotal === sorted[i - 1].subtotal
        ? positions[i - 1]
        : i + 1
    );
  }

  const rankingItems = sorted.map((item, idx) => ({
    rank: positions[idx],
    name: item.name,
    categoryId: item.categoryId,
    subtotal: roundEmissions(item.subtotal),
    percentage: rankingPercentages[idx],
    severity: getRankingSeverity(rankingPercentages[idx]),
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
  const mainActivityId = (orgData?.mainActivityId as string | null) ?? null;

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
      rate: roundEmissions(rate),
      activityName: mainActivity?.name ?? "actividad principal",
    };
  }

  // 9. Build suggested reduction plan (placeholder - could be AI-generated in the future)
  // TODO: implement someday
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
    carbonInventory: {
      id: inventory.id.toString(),
      name: inventory.name,
    },
    totalEmissions: roundEmissions(totalEmissions),
    categories,
    suggestedReductionPlan,
    subcategoriesRanking,
    mainActivityEquivalence,
  };
};
