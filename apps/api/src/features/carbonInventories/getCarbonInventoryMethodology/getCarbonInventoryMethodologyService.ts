import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { z } from "zod";

export type GetCarbonInventoryMethodologyResult =
  | { success: true; data: GetCarbonInventoryMethodologyResponse }
  | {
      success: false;
      error: "CARBON_INVENTORY_NOT_FOUND" | "METHODOLOGY_NOT_FOUND";
    };

export const getCarbonInventoryMethodologyService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint
): Promise<GetCarbonInventoryMethodologyResult> => {
  // First, get the carbon inventory to find its methodologyVersionId
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: carbonInventoryId,
    },
    select: {
      methodologyVersionId: true,
    },
  });

  if (!carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  if (!carbonInventory.methodologyVersionId) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // Then, get the methodology with all its related data
  /*
  Consider the following if performance becomes an issue:
  - Monitor query execution time and response size in production
  - Potentially add pagination for categories/subcategories if they grow large
  - Consider caching the methodology response since it's likely relatively static
  */
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: {
      id: carbonInventory.methodologyVersionId,
    },
    select: {
      name: true,
      description: true,
      categories: {
        select: {
          id: true,
          name: true,
          synonyms: true,
          description: true,
          examples: true,
          subcategories: {
            select: {
              id: true,
              name: true,
              description: true,
              examples: true,
              dimensions: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  isRequired: true,
                  values: {
                    select: {
                      id: true,
                      parentValueId: true,
                      value: true,
                    },
                    where: {
                      isActive: true,
                    },
                    orderBy: {
                      value: "asc",
                    },
                  },
                },
                orderBy: {
                  position: "asc",
                },
              },
              emissionFactors: {
                select: {
                  id: true,
                  dimensionValue1Id: true,
                  dimensionValue2Id: true,
                  rateMeasurementUnitId: true,
                  source: true,
                  gasDetails: true,
                  value: true,
                },
                orderBy: {
                  id: "asc",
                },
              },
            },
            orderBy: {
              name: "asc",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!methodology) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  return {
    success: true,
    data: {
      ...methodology,
      categories: methodology.categories.map((category) => ({
        ...category,
        id: category.id.toString(),
        subcategories: category.subcategories.map((subcategory) => ({
          ...subcategory,
          id: subcategory.id.toString(),
          dimensions: subcategory.dimensions.map((dimension) => ({
            ...dimension,
            id: dimension.id.toString(),
            values: dimension.values.map((value) => ({
              ...value,
              id: value.id.toString(),
              parentValueId: value.parentValueId?.toString() ?? null,
            })),
          })),
          emissionFactors: subcategory.emissionFactors.map(
            (emissionFactor) => ({
              id: emissionFactor.id.toString(),
              dimensionValue1Id:
                emissionFactor.dimensionValue1Id?.toString() ?? null,
              dimensionValue2Id:
                emissionFactor.dimensionValue2Id?.toString() ?? null,
              rateMeasurementUnitId:
                emissionFactor.rateMeasurementUnitId.toString(),
              source: emissionFactor.source,
              gasDetails: emissionFactor.gasDetails as z.infer<
                ReturnType<typeof z.json>
              >,
              value: emissionFactor.value.toString(),
            })
          ),
        })),
      })),
    },
  };
};
