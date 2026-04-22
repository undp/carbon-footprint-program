import {
  type PrismaClient,
  MethodologyVersionStatus,
  Prisma,
} from "@repo/database";
import {
  type DuplicateMethodologyResponse,
  type User,
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  SubcategoryStatus,
  EmissionFactorStatus,
} from "@repo/types";
import { mapMethodologyToResponse } from "../mappers.js";
import {
  MethodologyNotFoundError,
  MethodologyNameVersionAlreadyExistsError,
} from "../errors.js";
import { generateUniqueCopyName } from "@/helpers/generateUniqueCopyName.js";
import map from "lodash-es/map.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";

export const duplicateMethodologyService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DuplicateMethodologyResponse> => {
  try {
    const userId = user ? BigInt(user.id) : null;

    // Use transaction to duplicate methodology AND its active categories
    const duplicated = await prismaClient.$transaction(async (tx) => {
      // Find the original methodology
      const original = await tx.methodologyVersion.findUnique({
        where: { id: BigInt(id) },
      });

      if (!original) {
        throw new MethodologyNotFoundError();
      }

      // Generate unique copy name inside the transaction to minimize race window
      const existingNames = await tx.methodologyVersion.findMany({
        where: {
          countryId: original.countryId,
          status: { not: MethodologyVersionStatus.DELETED },
        },
        select: { name: true },
      });

      const duplicatedName = generateUniqueCopyName(
        original.name,
        map(existingNames, "name")
      );

      // Create a new methodology based on the original
      const newMethodology = await tx.methodologyVersion.create({
        data: {
          countryId: original.countryId,
          name: duplicatedName,
          description: original.description,
          regulation: original.regulation,
          version: original.version,
          status: MethodologyVersionStatus.UNPUBLISHED,
          createdById: userId,
          updatedAt: null,
        },
      });

      // Duplicate all active categories from the original methodology
      const activeCategories = await tx.category.findMany({
        where: {
          methodologyVersionId: original.id,
          status: CategoryStatus.ACTIVE,
        },
      });

      // Create categories individually to capture old → new ID mapping
      const categoryIdMap = new Map<bigint, bigint>();
      for (const cat of activeCategories) {
        const newCat = await tx.category.create({
          data: {
            methodologyVersionId: newMethodology.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            synonyms: cat.synonyms,
            description: cat.description,
            explanation: cat.explanation,
            position: cat.position,
            status: cat.status,
            createdById: userId,
            updatedAt: null,
          },
        });
        categoryIdMap.set(cat.id, newCat.id);
      }

      // Duplicate all active subcategories from the original categories
      const subcategoryIdMap = new Map<bigint, bigint>();

      if (activeCategories.length > 0) {
        const activeSubcategories = await tx.subcategory.findMany({
          where: {
            categoryId: { in: activeCategories.map((cat) => cat.id) },
            status: SubcategoryStatus.ACTIVE,
          },
          include: {
            subcategoryMeasurementUnits: {
              select: { measurementUnitId: true },
            },
          },
        });

        const measurementUnitLinks: {
          subcategoryId: bigint;
          measurementUnitId: bigint;
        }[] = [];

        for (const sub of activeSubcategories) {
          const newSub = await tx.subcategory.create({
            data: {
              categoryId: categoryIdMap.get(sub.categoryId)!,
              name: sub.name,
              icon: sub.icon,
              description: sub.description,
              explanation: sub.explanation,
              status: sub.status,
              createdById: userId,
              updatedAt: null,
            },
          });
          subcategoryIdMap.set(sub.id, newSub.id);

          for (const link of sub.subcategoryMeasurementUnits) {
            measurementUnitLinks.push({
              subcategoryId: newSub.id,
              measurementUnitId: link.measurementUnitId,
            });
          }
        }

        await tx.subcategoryMeasurementUnit.createMany({
          data: measurementUnitLinks,
        });
      }

      // Duplicate emission factor dimensions, dimension values, and emission factors
      if (subcategoryIdMap.size > 0) {
        const oldSubcategoryIds = [...subcategoryIdMap.keys()];

        // 1. Duplicate dimensions
        const dimensionIdMap = new Map<bigint, bigint>();
        const originalDimensions = await tx.emissionFactorDimension.findMany({
          where: {
            subcategoryId: { in: oldSubcategoryIds },
            status: EmissionFactorDimensionStatus.ACTIVE,
          },
        });

        for (const dim of originalDimensions) {
          const newDim = await tx.emissionFactorDimension.create({
            data: {
              subcategoryId: subcategoryIdMap.get(dim.subcategoryId)!,
              code: dim.code,
              name: dim.name,
              position: dim.position,
              isRequired: dim.isRequired,
              status: EmissionFactorDimensionStatus.ACTIVE,
              createdById: userId,
              updatedAt: null,
            },
          });
          dimensionIdMap.set(dim.id, newDim.id);
        }

        // 2. Duplicate dimension values (two passes to handle parentValueId)
        const dimensionValueIdMap = new Map<bigint, bigint>();

        if (dimensionIdMap.size > 0) {
          const originalValues = await tx.emissionFactorDimensionValue.findMany(
            {
              where: {
                dimensionId: { in: [...dimensionIdMap.keys()] },
                status: EmissionFactorDimensionValueStatus.ACTIVE,
              },
            }
          );

          // Pass 1: create all values without parentValueId
          for (const val of originalValues) {
            const newVal = await tx.emissionFactorDimensionValue.create({
              data: {
                dimensionId: dimensionIdMap.get(val.dimensionId)!,
                value: val.value,
                status: EmissionFactorDimensionValueStatus.ACTIVE,
                parentValueId: null,
                createdById: userId,
                updatedAt: null,
              },
            });
            dimensionValueIdMap.set(val.id, newVal.id);
          }

          // Pass 2: set parentValueId for values that had one
          const valuesWithParent = originalValues.filter(
            (v) => v.parentValueId !== null
          );
          for (const val of valuesWithParent) {
            const newValId = dimensionValueIdMap.get(val.id)!;
            const newParentId = val.parentValueId
              ? dimensionValueIdMap.get(val.parentValueId)
              : null;
            if (newParentId) {
              await tx.emissionFactorDimensionValue.update({
                where: { id: newValId },
                data: { parentValueId: newParentId },
              });
            }
          }
        }

        // 3. Duplicate active emission factors
        const originalFactors = await tx.emissionFactor.findMany({
          where: {
            subcategoryId: { in: oldSubcategoryIds },
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
                          is: { status: EmissionFactorDimensionStatus.ACTIVE },
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
                          is: { status: EmissionFactorDimensionStatus.ACTIVE },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        });

        for (const ef of originalFactors) {
          await tx.emissionFactor.create({
            data: {
              subcategoryId: subcategoryIdMap.get(ef.subcategoryId)!,
              dimensionValue1Id: ef.dimensionValue1Id
                ? (dimensionValueIdMap.get(ef.dimensionValue1Id) ?? null)
                : null,
              dimensionValue2Id: ef.dimensionValue2Id
                ? (dimensionValueIdMap.get(ef.dimensionValue2Id) ?? null)
                : null,
              rateMeasurementUnitId: ef.rateMeasurementUnitId,
              source: ef.source,
              gasDetails: ef.gasDetails ?? Prisma.JsonNull,
              value: ef.value,
              status: EmissionFactorStatus.ACTIVE,
              createdById: userId,
              updatedAt: null,
            },
          });
        }
      }

      return newMethodology;
    });

    return mapMethodologyToResponse(duplicated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (
          duplicatedFields.includes("name") ||
          duplicatedFields.includes("country_id") ||
          duplicatedFields.includes("version")
        ) {
          throw new MethodologyNameVersionAlreadyExistsError();
        }
      }
    }
    throw error;
  }
};
