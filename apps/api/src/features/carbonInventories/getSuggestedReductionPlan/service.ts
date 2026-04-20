import type { PrismaClient } from "@repo/database";
import {
  ReductionPlanInitiativeStatus,
  type GetSuggestedReductionPlanResponse,
} from "@repo/types";
import { fetchInventoryWithCategoryData } from "../helpers.js";

export const getSuggestedReductionPlanService = async (
  prismaClient: PrismaClient,
  id: string,
  limit: number
): Promise<GetSuggestedReductionPlanResponse> => {
  const { categoryData } = await fetchInventoryWithCategoryData(
    prismaClient,
    id
  );

  const rankedSubcategories = categoryData
    .flatMap((category) =>
      category.subcategories.map((sub) => ({
        subcategoryId: sub.id,
        subtotal: sub.subtotal,
        categoryPosition: category.position,
        subcategoryName: sub.name,
      }))
    )
    .sort(
      (a, b) =>
        b.subtotal - a.subtotal ||
        a.categoryPosition - b.categoryPosition ||
        a.subcategoryName.localeCompare(b.subcategoryName)
    );

  if (rankedSubcategories.length === 0) {
    return [];
  }

  const initiatives = await prismaClient.reductionPlanInitiative.findMany({
    where: {
      subcategoryId: {
        in: rankedSubcategories.map((s) => BigInt(s.subcategoryId)),
      },
      status: ReductionPlanInitiativeStatus.ACTIVE,
    },
    select: { id: true, title: true, description: true, subcategoryId: true },
    orderBy: { id: "asc" },
  });

  const initiativesBySubcategory = new Map<
    string,
    { id: bigint; title: string; description: string }[]
  >();
  for (const initiative of initiatives) {
    const key = initiative.subcategoryId.toString();
    const bucket = initiativesBySubcategory.get(key) ?? [];
    bucket.push({
      id: initiative.id,
      title: initiative.title,
      description: initiative.description,
    });
    initiativesBySubcategory.set(key, bucket);
  }

  const result: GetSuggestedReductionPlanResponse = [];
  for (const sub of rankedSubcategories) {
    const bucket = initiativesBySubcategory.get(sub.subcategoryId);
    if (!bucket) continue;
    for (const initiative of bucket) {
      result.push({
        id: initiative.id.toString(),
        title: initiative.title,
        description: initiative.description,
      });
      if (result.length === limit) return result;
    }
  }

  return result;
};
