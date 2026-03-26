import type { PrismaClient } from "@repo/database";
import type { GetReductionPlanResponse } from "@repo/types";
import { IconNameSchema } from "@repo/types";
import { fetchInventory } from "../helpers.js";

export const getReductionPlanService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetReductionPlanResponse> => {
  const inventory = await fetchInventory(prismaClient, id);

  // Get subcategory IDs from the carbon inventory's active lines
  const inventoryLines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId: inventory.id,
      status: "ACTIVE",
    },
    select: { subcategoryId: true },
  });
  const inventorySubcategoryIds = [
    ...new Set(inventoryLines.map((l) => l.subcategoryId)),
  ];

  if (inventorySubcategoryIds.length === 0) {
    return { categories: [], subcategories: [] };
  }

  // Fetch active initiatives for those subcategories
  const initiatives = await prismaClient.initiative.findMany({
    where: {
      subcategoryId: { in: inventorySubcategoryIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      title: true,
      description: true,
      subcategoryId: true,
    },
    orderBy: { id: "asc" },
  });

  if (initiatives.length === 0) {
    return { categories: [], subcategories: [] };
  }

  // Get subcategory IDs that actually have initiatives
  const subcategoryIdsWithInitiatives = [
    ...new Set(initiatives.map((i) => i.subcategoryId)),
  ];

  // Fetch subcategory details with their category
  const subcategories = await prismaClient.subcategory.findMany({
    where: { id: { in: subcategoryIdsWithInitiatives } },
    select: {
      id: true,
      name: true,
      icon: true,
      description: true,
      categoryId: true,
    },
  });

  // Get category IDs from those subcategories
  const categoryIds = [...new Set(subcategories.map((s) => s.categoryId))];

  // Fetch category details
  const categories = await prismaClient.category.findMany({
    where: { id: { in: categoryIds }, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      synonyms: true,
      position: true,
      icon: true,
      color: true,
      description: true,
      explanationId: true,
    },
    orderBy: { position: "asc" },
  });

  // Group initiatives by subcategory
  const initiativesBySubcategory = new Map<bigint, typeof initiatives>();
  for (const initiative of initiatives) {
    const existing =
      initiativesBySubcategory.get(initiative.subcategoryId) || [];
    existing.push(initiative);
    initiativesBySubcategory.set(initiative.subcategoryId, existing);
  }

  // Build subcategories response
  const subcategoriesResponse = subcategories.map((sub) => ({
    id: sub.id.toString(),
    name: sub.name,
    icon: IconNameSchema.parse(sub.icon),
    description: sub.description,
    categoryId: sub.categoryId.toString(),
    initiatives: (initiativesBySubcategory.get(sub.id) || []).map((i) => ({
      id: i.id.toString(),
      title: i.title,
      description: i.description,
    })),
  }));

  // Build categories response with initiative counts
  const categoriesResponse = categories.map((cat) => {
    const catSubcategories = subcategoriesResponse.filter(
      (s) => s.categoryId === cat.id.toString()
    );
    const initiativeCount = catSubcategories.reduce(
      (sum, s) => sum + s.initiatives.length,
      0
    );
    return {
      id: cat.id.toString(),
      name: cat.name,
      synonyms: cat.synonyms,
      position: cat.position,
      icon: IconNameSchema.parse(cat.icon),
      color: cat.color,
      description: cat.description,
      explanationId: cat.explanationId?.toString() ?? null,
      initiativeCount,
    };
  });

  return {
    categories: categoriesResponse,
    subcategories: subcategoriesResponse,
  };
};
