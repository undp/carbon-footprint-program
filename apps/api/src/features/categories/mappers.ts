import type { Category as PrismaCategory } from "@repo/database";
import { type GetAllCategoriesResponse, IconNameSchema } from "@repo/types";

/**
 * Maps a Prisma Category to the API response format.
 * Converts BigInt IDs to strings and dates to ISO strings.
 */
export function mapCategoryToResponse(
  category: PrismaCategory
): GetAllCategoriesResponse[number] {
  return {
    id: category.id.toString(),
    methodologyVersionId: category.methodologyVersionId.toString(),
    name: category.name,
    icon: IconNameSchema.parse(category.icon),
    color: category.color,
    synonyms: category.synonyms,
    description: category.description,
    explanationSlug: category.explanationSlug ?? null,
    examples: category.examples,
    position: category.position,
    status: category.status,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt?.toISOString() ?? null,
    createdById: category.createdById?.toString() ?? null,
    updatedById: category.updatedById?.toString() ?? null,
  };
}
