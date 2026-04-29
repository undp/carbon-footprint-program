import { Prisma } from "@repo/database";
import type { AdminReductionPlanInitiativeListItem } from "@repo/types";

export const adminReductionPlanInitiativeInclude = {
  subcategory: {
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ReductionPlanInitiativeInclude;

type AdminReductionPlanInitiativeRow =
  Prisma.ReductionPlanInitiativeGetPayload<{
    include: typeof adminReductionPlanInitiativeInclude;
  }>;

export const mapReductionPlanInitiativeToListItem = (
  row: AdminReductionPlanInitiativeRow
): AdminReductionPlanInitiativeListItem => ({
  id: row.id.toString(),
  title: row.title,
  description: row.description,
  subcategoryId: row.subcategoryId.toString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  subcategory: {
    id: row.subcategory.id.toString(),
    name: row.subcategory.name,
    category: {
      id: row.subcategory.category.id.toString(),
      name: row.subcategory.category.name,
    },
  },
});
