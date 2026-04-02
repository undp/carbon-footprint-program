import type { Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
} from "@repo/types";
import { EMISSION_FACTOR_GAS_DETAILS_TOLERANCE } from "@/config/constants.js";
import {
  DimensionNotConfiguredError,
  DimensionValueNotFoundError,
  EmissionFactorDuplicateError,
  EmissionFactorSourceConflictError,
  EmissionFactorGasDetailsMismatchError,
  SubcategoryChangeMissingDimensionsError,
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

/**
 * Enforces that all active emission factors for a subcategory share the same source.
 */
export async function validateSourceConsistency(
  tx: Prisma.TransactionClient,
  subcategoryId: bigint,
  source: string,
  excludeId?: bigint
): Promise<void> {
  const existingSource = await tx.emissionFactor.findFirst({
    where: {
      subcategoryId,
      status: EmissionFactorStatus.ACTIVE,
      ...(excludeId != null ? { id: { not: excludeId } } : {}),
    },
    select: { source: true },
  });

  if (existingSource && existingSource.source !== source) {
    throw new EmissionFactorSourceConflictError(existingSource.source);
  }
}

/**
 * Validates that the gas details breakdown sums to the declared value.
 * Skips validation when the breakdown sums to zero.
 */
export function validateGasDetailsSum(
  gasDetails: Record<string, number>,
  declaredValue: number
): void {
  const gasSum = Object.values(gasDetails).reduce((sum, v) => sum + v, 0);
  if (
    gasSum > 0 &&
    Math.abs(gasSum - declaredValue) > EMISSION_FACTOR_GAS_DETAILS_TOLERANCE
  ) {
    throw new EmissionFactorGasDetailsMismatchError(
      gasSum.toFixed(4),
      declaredValue.toFixed(4)
    );
  }
}

/**
 * When changing subcategory, dimension values from the old subcategory are
 * invalid — requires the caller to explicitly provide them for the new one.
 */
export function validateSubcategoryChangeDimensions(
  newSubcategoryId: string | undefined,
  existingSubcategoryId: bigint,
  dimensionValue1Name: string | null | undefined,
  dimensionValue2Name: string | null | undefined
): void {
  if (
    newSubcategoryId !== undefined &&
    BigInt(newSubcategoryId) !== existingSubcategoryId &&
    (dimensionValue1Name === undefined || dimensionValue2Name === undefined)
  ) {
    throw new SubcategoryChangeMissingDimensionsError();
  }
}
