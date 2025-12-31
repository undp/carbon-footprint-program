import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryMethodologyResponse } from "@repo/types";

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
  // First, get the carbon inventory to find its methodology_version_id
  const carbonInventory = await prismaClient.carbon_inventory.findUnique({
    where: {
      id: carbonInventoryId,
    },
    select: {
      methodology_version_id: true,
    },
  });

  if (!carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  if (!carbonInventory.methodology_version_id) {
    return { success: false, error: "METHODOLOGY_NOT_FOUND" };
  }

  // Then, get the methodology with all its related data
  /*
  Consider the following if performance becomes an issue:
  - Monitor query execution time and response size in production
  - Potentially add pagination for categories/subcategories if they grow large
  - Consider caching the methodology response since it's likely relatively static
  */
  const methodology = await prismaClient.methodology_version.findUnique({
    where: {
      id: carbonInventory.methodology_version_id,
    },
    select: {
      name: true,
      description: true,
      categories: {
        select: {
          id: true,
          name: true,
          position: true,
          synonyms: true,
          description: true,
          examples: true,
          subcategories: {
            select: {
              id: true,
              name: true,
              description: true,
              examples: true,
              emission_factor_dimensions: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  is_required: true,
                  emission_factor_dimension_values: {
                    select: {
                      id: true,
                      parent_value_id: true,
                      value: true,
                    },
                    where: {
                      is_active: true,
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
            },
            orderBy: {
              name: "asc",
            },
          },
        },
        orderBy: [
          { position: "asc" },
          { name: "asc" },
        ],
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
          dimensions: subcategory.emission_factor_dimensions.map(
            (dimension) => ({
              ...dimension,
              id: dimension.id.toString(),
              values: dimension.emission_factor_dimension_values.map(
                (value) => ({
                  ...value,
                  id: value.id.toString(),
                  parent_value_id: value.parent_value_id?.toString() ?? null,
                })
              ),
            })
          ),
        })),
      })),
    },
  };
};
