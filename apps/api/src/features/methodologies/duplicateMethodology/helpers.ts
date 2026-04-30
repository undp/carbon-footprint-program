import { Prisma } from "@repo/database";
import {
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
  SubcategoryStatus,
} from "@repo/types";

// `createManyAndReturn` on PostgreSQL preserves input order, which is what
// makes the `original[i].id → created[i].id` zip below safe.

export const cloneCategories = async (
  tx: Prisma.TransactionClient,
  originalMethodologyId: bigint,
  newMethodologyId: bigint,
  userId: bigint | null
): Promise<Map<bigint, bigint>> => {
  const activeCategories = await tx.category.findMany({
    where: {
      methodologyVersionId: originalMethodologyId,
      status: CategoryStatus.ACTIVE,
    },
  });

  if (activeCategories.length === 0) {
    return new Map();
  }

  const created = await tx.category.createManyAndReturn({
    data: activeCategories.map((cat) => ({
      methodologyVersionId: newMethodologyId,
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
    })),
    select: { id: true },
  });

  return new Map(activeCategories.map((cat, i) => [cat.id, created[i].id]));
};

export const cloneSubcategories = async (
  tx: Prisma.TransactionClient,
  categoryIdMap: Map<bigint, bigint>,
  userId: bigint | null
): Promise<Map<bigint, bigint>> => {
  const oldCategoryIds = [...categoryIdMap.keys()];
  if (oldCategoryIds.length === 0) {
    return new Map();
  }

  const activeSubcategories = await tx.subcategory.findMany({
    where: {
      categoryId: { in: oldCategoryIds },
      status: SubcategoryStatus.ACTIVE,
    },
    include: {
      subcategoryMeasurementUnits: {
        select: { measurementUnitId: true },
      },
    },
  });

  if (activeSubcategories.length === 0) {
    return new Map();
  }

  const created = await tx.subcategory.createManyAndReturn({
    data: activeSubcategories.map((sub) => ({
      categoryId: categoryIdMap.get(sub.categoryId)!,
      name: sub.name,
      icon: sub.icon,
      description: sub.description,
      explanation: sub.explanation,
      status: sub.status,
      createdById: userId,
      updatedAt: null,
    })),
    select: { id: true },
  });

  const subcategoryIdMap = new Map<bigint, bigint>(
    activeSubcategories.map((sub, i) => [sub.id, created[i].id])
  );

  const measurementUnitLinks = activeSubcategories.flatMap((sub, i) =>
    sub.subcategoryMeasurementUnits.map((link) => ({
      subcategoryId: created[i].id,
      measurementUnitId: link.measurementUnitId,
    }))
  );

  if (measurementUnitLinks.length > 0) {
    await tx.subcategoryMeasurementUnit.createMany({
      data: measurementUnitLinks,
    });
  }

  return subcategoryIdMap;
};

export const cloneEmissionFactorDimensions = async (
  tx: Prisma.TransactionClient,
  subcategoryIdMap: Map<bigint, bigint>,
  userId: bigint | null
): Promise<Map<bigint, bigint>> => {
  const oldSubcategoryIds = [...subcategoryIdMap.keys()];
  if (oldSubcategoryIds.length === 0) {
    return new Map();
  }

  const originalDimensions = await tx.emissionFactorDimension.findMany({
    where: {
      subcategoryId: { in: oldSubcategoryIds },
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
  });

  if (originalDimensions.length === 0) {
    return new Map();
  }

  const created = await tx.emissionFactorDimension.createManyAndReturn({
    data: originalDimensions.map((dim) => ({
      subcategoryId: subcategoryIdMap.get(dim.subcategoryId)!,
      code: dim.code,
      name: dim.name,
      position: dim.position,
      isRequired: dim.isRequired,
      status: EmissionFactorDimensionStatus.ACTIVE,
      createdById: userId,
      updatedAt: null,
    })),
    select: { id: true },
  });

  return new Map(originalDimensions.map((dim, i) => [dim.id, created[i].id]));
};

export const cloneEmissionFactorDimensionValues = async (
  tx: Prisma.TransactionClient,
  dimensionIdMap: Map<bigint, bigint>,
  userId: bigint | null
): Promise<Map<bigint, bigint>> => {
  const oldDimensionIds = [...dimensionIdMap.keys()];
  if (oldDimensionIds.length === 0) {
    return new Map();
  }

  const originalValues = await tx.emissionFactorDimensionValue.findMany({
    where: {
      dimensionId: { in: oldDimensionIds },
      status: EmissionFactorDimensionValueStatus.ACTIVE,
    },
  });

  if (originalValues.length === 0) {
    return new Map();
  }

  // Pass 1: insert all rows with parentValueId=null so the bulk insert never
  // depends on its own not-yet-mapped IDs.
  const created = await tx.emissionFactorDimensionValue.createManyAndReturn({
    data: originalValues.map((val) => ({
      dimensionId: dimensionIdMap.get(val.dimensionId)!,
      value: val.value,
      status: EmissionFactorDimensionValueStatus.ACTIVE,
      parentValueId: null,
      createdById: userId,
      updatedAt: null,
    })),
    select: { id: true },
  });

  const valueIdMap = new Map<bigint, bigint>(
    originalValues.map((val, i) => [val.id, created[i].id])
  );

  // Pass 2: backfill parentValueId now that every original id has a remap.
  const valuesWithParent = originalValues.filter(
    (v) => v.parentValueId !== null
  );
  for (const val of valuesWithParent) {
    const newParentId = val.parentValueId
      ? valueIdMap.get(val.parentValueId)
      : null;
    if (newParentId) {
      await tx.emissionFactorDimensionValue.update({
        where: { id: valueIdMap.get(val.id)! },
        data: { parentValueId: newParentId },
      });
    }
  }

  return valueIdMap;
};

export const cloneEmissionFactors = async (
  tx: Prisma.TransactionClient,
  subcategoryIdMap: Map<bigint, bigint>,
  dimensionValueIdMap: Map<bigint, bigint>,
  userId: bigint | null
): Promise<void> => {
  const oldSubcategoryIds = [...subcategoryIdMap.keys()];
  if (oldSubcategoryIds.length === 0) {
    return;
  }

  // Skip rows whose referenced dim value (or its parent dimension) is inactive,
  // otherwise the clone would copy factors that point at deleted config.
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

  if (originalFactors.length === 0) {
    return;
  }

  await tx.emissionFactor.createMany({
    data: originalFactors.map((ef) => ({
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
    })),
  });
};

export const cloneReductionPlanInitiatives = async (
  tx: Prisma.TransactionClient,
  subcategoryIdMap: Map<bigint, bigint>,
  dimensionValueIdMap: Map<bigint, bigint>,
  userId: bigint | null
): Promise<void> => {
  const oldSubcategoryIds = [...subcategoryIdMap.keys()];
  if (oldSubcategoryIds.length === 0) {
    return;
  }

  // Same active-dim-value guard as emission factors: an initiative scoped to a
  // dim value that has been deleted would not round-trip after duplication.
  const originalInitiatives = await tx.reductionPlanInitiative.findMany({
    where: {
      subcategoryId: { in: oldSubcategoryIds },
      status: ReductionPlanInitiativeStatus.ACTIVE,
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

  if (originalInitiatives.length === 0) {
    return;
  }

  await tx.reductionPlanInitiative.createMany({
    data: originalInitiatives.map((initiative) => ({
      subcategoryId: subcategoryIdMap.get(initiative.subcategoryId)!,
      dimensionValue1Id: initiative.dimensionValue1Id
        ? (dimensionValueIdMap.get(initiative.dimensionValue1Id) ?? null)
        : null,
      dimensionValue2Id: initiative.dimensionValue2Id
        ? (dimensionValueIdMap.get(initiative.dimensionValue2Id) ?? null)
        : null,
      title: initiative.title,
      description: initiative.description,
      status: ReductionPlanInitiativeStatus.ACTIVE,
      createdById: userId,
      updatedAt: null,
    })),
  });
};

export const cloneSubcategoryRecommendations = async (
  tx: Prisma.TransactionClient,
  subcategoryIdMap: Map<bigint, bigint>,
  userId: bigint | null
): Promise<void> => {
  const oldSubcategoryIds = [...subcategoryIdMap.keys()];
  if (oldSubcategoryIds.length === 0) {
    return;
  }

  const originalRecommendations = await tx.subcategoryRecommendation.findMany({
    where: {
      subcategoryId: { in: oldSubcategoryIds },
      status: SubcategoryRecommendationStatus.ACTIVE,
    },
  });

  if (originalRecommendations.length === 0) {
    return;
  }

  await tx.subcategoryRecommendation.createMany({
    data: originalRecommendations.map((rec) => ({
      subcategoryId: subcategoryIdMap.get(rec.subcategoryId)!,
      sectorId: rec.sectorId,
      subsectorId: rec.subsectorId,
      status: SubcategoryRecommendationStatus.ACTIVE,
      createdById: userId,
      updatedAt: null,
    })),
  });
};
