import {
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  MethodologyVersionStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type { GetMethodologyExportResponse } from "@repo/types";
import { MethodologyNotFoundError } from "../errors.js";
import { mapMethodologyExportToResponse } from "../mappers.js";

export const getMethodologyExportService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetMethodologyExportResponse> => {
  const methodology = await prismaClient.methodologyVersion.findFirst({
    where: {
      id: BigInt(id),
      status: {
        in: [
          MethodologyVersionStatus.PUBLISHED,
          MethodologyVersionStatus.UNPUBLISHED,
        ],
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      regulation: true,
      version: true,
      status: true,
      categories: {
        where: { status: CategoryStatus.ACTIVE },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          position: true,
          synonyms: true,
          description: true,
          subcategories: {
            where: { status: SubcategoryStatus.ACTIVE },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              subcategoryMeasurementUnits: {
                select: {
                  measurementUnit: {
                    select: {
                      id: true,
                      name: true,
                      abbreviation: true,
                    },
                  },
                },
              },
              dimensions: {
                where: { status: EmissionFactorDimensionStatus.ACTIVE },
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  name: true,
                  position: true,
                  isRequired: true,
                  values: {
                    where: {
                      status: EmissionFactorDimensionValueStatus.ACTIVE,
                    },
                    orderBy: { value: "asc" },
                    select: { id: true, value: true },
                  },
                },
              },
              emissionFactors: {
                where: { status: EmissionFactorStatus.ACTIVE },
                select: {
                  id: true,
                  source: true,
                  value: true,
                  gasDetails: true,
                  dimensionValue1: { select: { id: true, value: true } },
                  dimensionValue2: { select: { id: true, value: true } },
                  rateMeasurementUnit: {
                    select: { id: true, name: true, abbreviation: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!methodology) {
    throw new MethodologyNotFoundError();
  }

  return mapMethodologyExportToResponse(methodology);
};
