import type { PrismaClient } from "@repo/database";
import {
  SubcategoryStatus,
  User,
  IconNameSchema,
  type GetAllSubcategoriesResponse,
  type GetAllSubcategoriesQuery,
} from "@repo/types";

export const getAllSubcategoriesService = async (
  prismaClient: PrismaClient,
  query: GetAllSubcategoriesQuery | null,
  _user: User | null
): Promise<GetAllSubcategoriesResponse> => {
  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      ...(query?.methodologyVersionId
        ? {
            category: {
              methodologyVersionId: BigInt(query.methodologyVersionId),
            },
          }
        : {}),
      status: SubcategoryStatus.ACTIVE,
    },
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
      subcategoryMeasurementUnits: {
        select: {
          measurementUnit: {
            select: { id: true, name: true },
          },
        },
      },
    },
    // `category.id` breaks the tie the category position leaves open: the
    // category status is not filtered here and positions are unique only among
    // non-DELETED categories, so a soft-deleted category can share a position
    // with a live one and their subcategories would otherwise interleave in
    // heap order, changing between refetches.
    orderBy: [
      { category: { position: "asc" } },
      { category: { id: "asc" } },
      { position: "asc" },
    ],
  });

  return subcategories.map(
    ({ category, subcategoryMeasurementUnits, ...subcategory }) => ({
      id: subcategory.id.toString(),
      name: subcategory.name,
      icon: IconNameSchema.parse(subcategory.icon),
      description: subcategory.description,
      explanation: subcategory.explanation,
      position: subcategory.position,
      category: {
        id: category.id.toString(),
        name: category.name,
        color: category.color,
      },
      measurementUnits: subcategoryMeasurementUnits.map(
        ({ measurementUnit }) => ({
          id: measurementUnit.id.toString(),
          name: measurementUnit.name,
        })
      ),
    })
  );
};
