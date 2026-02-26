import type {
  Subcategory as PrismaSubcategory,
  Category as PrismaCategory,
} from "@repo/database";
import type { SubCategoryWithUnits } from "@repo/types";

type SubcategoryWithCategory = PrismaSubcategory & {
  category: Pick<PrismaCategory, "methodologyVersionId">;
};

/**
 * Maps a Prisma Subcategory (with included category) to the API response format.
 * Converts BigInt IDs to strings and dates to ISO strings.
 */
export function mapSubcategoryToResponse(
  subcategory: SubcategoryWithCategory,
  measurementUnitIds: bigint[]
): SubCategoryWithUnits {
  return {
    id: subcategory.id.toString(),
    categoryId: subcategory.categoryId.toString(),
    name: subcategory.name,
    icon: subcategory.icon,
    color: subcategory.color,
    description: subcategory.description,
    examples: subcategory.examples,
    status: subcategory.status,
    createdAt: subcategory.createdAt.toISOString(),
    updatedAt: subcategory.updatedAt?.toISOString() ?? null,
    createdById: subcategory.createdById?.toString() ?? null,
    updatedById: subcategory.updatedById?.toString() ?? null,
    measurementUnitIds: measurementUnitIds.map((id) => id.toString()),
  };
}
