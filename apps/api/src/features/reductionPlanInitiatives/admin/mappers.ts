import { Prisma } from "@repo/database";
import type { AdminInitiativeListItem } from "@repo/types";

export const adminInitiativeInclude = {
  subcategory: {
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ReductionPlanInitiativeInclude;

type AdminInitiativeRow = Prisma.ReductionPlanInitiativeGetPayload<{
  include: typeof adminInitiativeInclude;
}>;

export const mapInitiativeToListItem = (
  row: AdminInitiativeRow
): AdminInitiativeListItem => ({
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
