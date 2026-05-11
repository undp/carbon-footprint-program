import type { PrismaClient } from "@repo/database";
import {
  GetCarbonInventoryMethodologyResponse,
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  SubcategoryStatus,
  IconNameSchema,
  EmissionFactorStatus,
} from "@repo/types";
import { z } from "zod";
import {
  buildRateUnitsByMagnitudeMap,
  generateConvertedEmissionFactors,
} from "./helper.js";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
} from "../errors.js";

type JSONType = z.infer<ReturnType<typeof z.json>>;

export const getCarbonInventoryMethodologyService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint
): Promise<GetCarbonInventoryMethodologyResponse> => {
  // First, get the carbon inventory to find its methodologyVersionId
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: carbonInventoryId,
    },
    select: {
      methodologyVersionId: true,
    },
  });

  if (!carbonInventory)
    throw new CarbonInventoryNotFoundError(carbonInventoryId);

  if (!carbonInventory.methodologyVersionId)
    throw new MethodologyNotFoundError(carbonInventoryId);

  // Then, get the methodology with all its related data
  /*
  Consider the following if performance becomes an issue:
  - Monitoring the response size and query performance in production
  - Potentially add pagination for categories/subcategories or emission factors grow large
  - Consider caching the methodology response since it's likely relatively static
  - Evaluating whether all converted factors need to be returned or if they could be computed on-demand by the client
  */
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: {
      id: carbonInventory.methodologyVersionId,
    },
    select: {
      name: true,
      description: true,
      categories: {
        where: {
          status: CategoryStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          synonyms: true,
          description: true,
          explanation: true,
          icon: true,
          color: true,
          position: true,
          subcategories: {
            where: {
              status: SubcategoryStatus.ACTIVE,
            },
            select: {
              id: true,
              name: true,
              icon: true,
              description: true,
              explanation: true,
              dimensions: {
                where: {
                  status: EmissionFactorDimensionStatus.ACTIVE,
                },
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
                      status: EmissionFactorDimensionValueStatus.ACTIVE,
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
                where: {
                  status: EmissionFactorStatus.ACTIVE,
                  AND: [
                    {
                      OR: [
                        { dimensionValue1Id: null },
                        {
                          dimensionValue1: {
                            is: {
                              status: EmissionFactorDimensionValueStatus.ACTIVE,
                              dimension: {
                                is: {
                                  status: EmissionFactorDimensionStatus.ACTIVE,
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                    {
                      OR: [
                        { dimensionValue2Id: null },
                        {
                          dimensionValue2: {
                            is: {
                              status: EmissionFactorDimensionValueStatus.ACTIVE,
                              dimension: {
                                is: {
                                  status: EmissionFactorDimensionStatus.ACTIVE,
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                select: {
                  id: true,
                  dimensionValue1Id: true,
                  dimensionValue2Id: true,
                  rateMeasurementUnitId: true,
                  source: true,
                  gasDetails: true,
                  value: true,
                  rateMeasurementUnit: {
                    select: {
                      id: true,
                      numeratorMeasurementUnit: {
                        select: {
                          id: true,
                          magnitudeId: true,
                          baseFactor: true,
                        },
                      },
                      denominatorMeasurementUnit: {
                        select: {
                          id: true,
                          magnitudeId: true,
                          baseFactor: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  id: "asc",
                },
              },
              subcategoryMeasurementUnits: {
                select: {
                  measurementUnitId: true,
                },
              },
            },
            orderBy: {
              name: "asc",
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!methodology) throw new MethodologyNotFoundError(carbonInventoryId);

  // Build the rate units by magnitude map for conversion
  const rateUnitsByMagnitude = await buildRateUnitsByMagnitudeMap(prismaClient);

  return {
    ...methodology,
    categories: methodology.categories.map((category) => ({
      ...category,
      id: category.id.toString(),
      icon: IconNameSchema.parse(category.icon),
      explanation: category.explanation ?? null,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id.toString(),
        name: subcategory.name,
        icon: IconNameSchema.parse(subcategory.icon),
        description: subcategory.description,
        explanation: subcategory.explanation ?? null,
        dimensions: subcategory.dimensions.map((dimension) => ({
          ...dimension,
          id: dimension.id.toString(),
          values: dimension.values.map((value) => ({
            ...value,
            id: value.id.toString(),
            parentValueId: value.parentValueId?.toString() ?? null,
          })),
        })),
        emissionFactors: subcategory.emissionFactors.flatMap((emissionFactor) =>
          generateConvertedEmissionFactors(
            emissionFactor,
            rateUnitsByMagnitude
          ).map((factor) => ({
            ...factor,
            gasDetails: factor.gasDetails as unknown as JSONType,
          }))
        ),
        allowedMeasurementUnitIds: subcategory.subcategoryMeasurementUnits.map(
          (smu) => smu.measurementUnitId.toString()
        ),
      })),
    })),
  };
};
