import type { Subcategory as PrismaSubcategory } from "@repo/database";
import { type SubcategoryBase, IconNameSchema } from "@repo/types";

/**
 * Maps a Prisma Subcategory to the shared base shape.
 * Converts BigInt IDs to strings and dates to ISO strings.
 */
export function mapSubcategoryToBase(
  subcategory: PrismaSubcategory
): SubcategoryBase {
  return {
    id: subcategory.id.toString(),
    categoryId: subcategory.categoryId.toString(),
    name: subcategory.name,
    icon: IconNameSchema.parse(subcategory.icon),
    description: subcategory.description,
    explanation: subcategory.explanation,
    position: subcategory.position,
    status: subcategory.status,
    createdAt: subcategory.createdAt.toISOString(),
    updatedAt: subcategory.updatedAt?.toISOString() ?? null,
    createdById: subcategory.createdById?.toString() ?? null,
    updatedById: subcategory.updatedById?.toString() ?? null,
  };
}
