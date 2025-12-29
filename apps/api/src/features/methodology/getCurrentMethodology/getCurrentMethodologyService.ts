import type { PrismaClient } from "@repo/database";
import type { GetCurrentMethodologyResponse } from "@repo/types";

export const getCurrentMethodologyService = async (
  prismaClient: PrismaClient
): Promise<GetCurrentMethodologyResponse | null> => {
  const methodology = await prismaClient.methodology_version.findFirst({
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
    orderBy: {
      id: "asc",
    },
  });

  if (!methodology) {
    return null;
  }

  return {
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
        emission_factor_dimensions: subcategory.emission_factor_dimensions.map(
          (dimension) => ({
            code: dimension.code,
            name: dimension.name,
            position: dimension.position,
            is_required: dimension.is_required,
            values: dimension.emission_factor_dimension_values.map((value) => ({
              name: value.value,
              parent_value: value.parent_value
                ? {
                    dimension_code: value.parent_value.dimension.code,
                    value_name: value.parent_value.value,
                  }
                : null,
            })),
          })
        ),
      })),
    })),
  };
};
