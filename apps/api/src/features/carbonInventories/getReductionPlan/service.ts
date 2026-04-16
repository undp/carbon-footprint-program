import type { PrismaClient } from "@repo/database";
import {
  CarbonInventoryLineStatus,
  CategoryStatus,
  InventoryStatus,
  ReductionPlanInitiativeStatus,
  type GetReductionPlanResponse,
} from "@repo/types";
import { IconNameSchema } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";

export const getReductionPlanService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetReductionPlanResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id), status: InventoryStatus.ACTIVE },
    select: {
      id: true,
      lines: {
        where: { status: CarbonInventoryLineStatus.ACTIVE },
        select: { subcategoryId: true },
      },
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  const subcategoryIds = [
    ...new Set(inventory.lines.map((l) => l.subcategoryId)),
  ];

  if (subcategoryIds.length === 0) {
    return { categories: [] };
  }

  // Fetch categories with nested subcategories and initiatives in a single query
  const categories = await prismaClient.category.findMany({
    where: {
      status: CategoryStatus.ACTIVE,
      subcategories: {
        some: {
          id: { in: subcategoryIds },
          reductionPlanInitiatives: {
            some: { status: ReductionPlanInitiativeStatus.ACTIVE },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      synonyms: true,
      position: true,
      icon: true,
      color: true,
      description: true,
      explanationSlug: true,
      subcategories: {
        where: {
          id: { in: subcategoryIds },
          reductionPlanInitiatives: {
            some: { status: ReductionPlanInitiativeStatus.ACTIVE },
          },
        },
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
          reductionPlanInitiatives: {
            where: { status: ReductionPlanInitiativeStatus.ACTIVE },
            select: { id: true, title: true, description: true },
            orderBy: { id: "asc" },
          },
        },
      },
    },
    orderBy: { position: "asc" },
  });

  return {
    categories: categories.map((cat) => ({
      id: cat.id.toString(),
      name: cat.name,
      synonyms: cat.synonyms,
      position: cat.position,
      icon: IconNameSchema.parse(cat.icon),
      color: cat.color,
      description: cat.description,
      explanationSlug: cat.explanationSlug ?? null,
      subcategories: cat.subcategories.map((sub) => ({
        id: sub.id.toString(),
        name: sub.name,
        icon: IconNameSchema.parse(sub.icon),
        description: sub.description,
        initiatives: sub.reductionPlanInitiatives.map((i) => ({
          id: i.id.toString(),
          title: i.title,
          description: i.description,
        })),
      })),
    })),
  };
};
