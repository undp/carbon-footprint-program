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
    orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
  });

  return subcategories.map(
    ({ category, subcategoryMeasurementUnits, ...subcategory }) => ({
      id: subcategory.id.toString(),
      name: subcategory.name,
      icon: IconNameSchema.parse(subcategory.icon),
      description: subcategory.description,
      explanation: subcategory.explanation,
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
