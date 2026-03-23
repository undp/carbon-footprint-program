import type { Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
} from "@repo/types";
import {
  DimensionNotConfiguredError,
  DimensionValueNotFoundError,
  EmissionFactorDuplicateError,
} from "./errors.js";

/**
 * Looks up an existing dimension value by name for a given subcategory and position.
 * Throws if the dimension or value does not exist.
 */
export async function findDimensionValue(
  tx: Prisma.TransactionClient,
  subcategoryId: bigint,
  position: number,
  valueName: string
): Promise<bigint> {
  const dimension = await tx.emissionFactorDimension.findFirst({
    where: {
      subcategoryId,
      position,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!dimension) {
    throw new DimensionNotConfiguredError(position.toString());
  }

  const value = await tx.emissionFactorDimensionValue.findFirst({
    where: {
      dimensionId: dimension.id,
      value: valueName,
      status: EmissionFactorDimensionValueStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!value) {
    throw new DimensionValueNotFoundError(valueName, position.toString());
  }

  return value.id;
}

/**
 * Checks that no other ACTIVE emission factor exists with the same
 * uniqueness key for the given subcategory.
 *
 * The uniqueness key is always subcategoryId, plus each dimension value
 * whose dimension is marked as required for that subcategory. Optional
 * dimensions are not part of the key — multiple factors may coexist with
 * different (or null) optional dimension values.
 */
export async function checkDuplicateEmissionFactor(
  tx: Prisma.TransactionClient,
  subcategoryId: bigint,
  dimensionValue1Id: bigint | null,
  dimensionValue2Id: bigint | null,
  excludeId?: bigint
): Promise<void> {
  const requiredDimensions = await tx.emissionFactorDimension.findMany({
    where: {
      subcategoryId,
      isRequired: true,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    select: { position: true },
  });

  const requiredPositions = new Set(requiredDimensions.map((d) => d.position));

  const where: Prisma.EmissionFactorWhereInput = {
    subcategoryId,
    status: EmissionFactorStatus.ACTIVE,
    ...(excludeId != null ? { id: { not: excludeId } } : {}),
  };

  if (requiredPositions.has(1)) {
    where.dimensionValue1Id = dimensionValue1Id ?? null;
  }
  if (requiredPositions.has(2)) {
    where.dimensionValue2Id = dimensionValue2Id ?? null;
  }

  const duplicate = await tx.emissionFactor.findFirst({
    where,
    select: { id: true },
  });

  if (duplicate) {
    throw new EmissionFactorDuplicateError();
  }
}
