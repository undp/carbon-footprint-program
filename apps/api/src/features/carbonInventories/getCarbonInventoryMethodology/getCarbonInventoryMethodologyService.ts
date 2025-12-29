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
  const methodology = await prismaClient.methodology_version.findUnique({
    where: {
      id: carbonInventory.methodology_version_id,
    },
    include: {
      country: {
        select: {
          iso_code: true,
        },
      },
      status: {
        select: {
          code: true,
        },
      },
      categories: {
        include: {
          subcategories: {
            include: {
              emission_factor_dimensions: {
                include: {
                  emission_factor_dimension_values: {
                    include: {
                      parent_value: {
                        include: {
                          dimension: {
                            select: {
                              code: true,
                            },
                          },
                        },
                      },
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
      country_iso_code: methodology.country.iso_code,
      name: methodology.name,
      description: methodology.description,
      status_code: methodology.status.code,
      categories: methodology.categories.map((category) => ({
        name: category.name,
        synonyms: category.synonyms,
        description: category.description,
        examples: category.examples,
        subcategories: category.subcategories.map((subcategory) => ({
          name: subcategory.name,
          description: subcategory.description,
          examples: subcategory.examples,
          emission_factor_dimensions:
            subcategory.emission_factor_dimensions.map((dimension) => ({
              code: dimension.code,
              name: dimension.name,
              position: dimension.position,
              is_required: dimension.is_required,
              values: dimension.emission_factor_dimension_values.map(
                (value) => ({
                  name: value.value,
                  parent_value: value.parent_value
                    ? {
                        dimension_code: value.parent_value.dimension.code,
                        value_name: value.parent_value.value,
                      }
                    : null,
                })
              ),
            })),
        })),
      })),
    },
  };
};
