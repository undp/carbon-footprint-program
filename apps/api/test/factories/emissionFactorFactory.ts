import {
  type PrismaClient,
  type EmissionFactor,
  type EmissionFactorDimension,
  type EmissionFactorDimensionValue,
  Prisma,
} from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  GetAllEmissionFactorsResponse,
  EmissionFactorStatus,
} from "@repo/types";

const DEFAULT_GAS_DETAILS: GetAllEmissionFactorsResponse[number]["gasDetails"] =
  {
    CO2_FOSSIL: 0,
    CH4: 0,
    N2O: 0,
    HFC: 0,
    PFC: 0,
    SF6: 0,
    NF3: 0,
  };

/**
 * Creates a test emission factor with sensible defaults.
 */
export async function createTestEmissionFactor(
  prisma: PrismaClient,
  subcategoryId: bigint,
  rateMeasurementUnitId: bigint,
  overrides?: Partial<{
    dimensionValue1Id: bigint | null;
    dimensionValue2Id: bigint | null;
    source: string;
    gasDetails: object;
    value: string;
    status: string;
  }>
): Promise<EmissionFactor> {
  return await prisma.emissionFactor.create({
    data: {
      subcategoryId,
      dimensionValue1Id: overrides?.dimensionValue1Id ?? null,
      dimensionValue2Id: overrides?.dimensionValue2Id ?? null,
      rateMeasurementUnitId,
      source: overrides?.source ?? `Test Source`,
      gasDetails: overrides?.gasDetails ?? DEFAULT_GAS_DETAILS,
      value: new Prisma.Decimal(overrides?.value ?? "1.5"),
      status:
        (overrides?.status as EmissionFactor["status"]) ??
        EmissionFactorStatus.ACTIVE,
      createdById: null,
      updatedAt: null,
    },
  });
}

/**
 * Creates a test emission factor dimension.
 */
export async function createTestEmissionFactorDimension(
  prisma: PrismaClient,
  subcategoryId: bigint,
  overrides?: Partial<{
    code: string;
    name: string;
    position: number;
    isRequired: boolean;
    status: EmissionFactorDimension["status"];
  }>
): Promise<EmissionFactorDimension> {
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return await prisma.emissionFactorDimension.create({
    data: {
      subcategoryId,
      code: overrides?.code ?? `test_dim_${randomSuffix}`,
      name: overrides?.name ?? `Test Dimension ${randomSuffix}`,
      position: overrides?.position ?? 1,
      isRequired: overrides?.isRequired ?? false,
      status: overrides?.status ?? EmissionFactorDimensionStatus.ACTIVE,
      createdById: null,
      updatedAt: null,
    },
  });
}

/**
 * Creates a test emission factor dimension value.
 */
export async function createTestEmissionFactorDimensionValue(
  prisma: PrismaClient,
  dimensionId: bigint,
  overrides?: Partial<{
    value: string;
    status: EmissionFactorDimensionValue["status"];
    parentValueId: bigint | null;
  }>
): Promise<EmissionFactorDimensionValue> {
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return await prisma.emissionFactorDimensionValue.create({
    data: {
      dimensionId,
      value: overrides?.value ?? `Test Value ${randomSuffix}`,
      status: overrides?.status ?? EmissionFactorDimensionValueStatus.ACTIVE,
      parentValueId: overrides?.parentValueId ?? null,
      createdById: null,
      updatedAt: null,
    },
  });
}

/**
 * Gets a RateMeasurementUnit ID from the seeded test database.
 */
export async function getTestRateMeasurementUnitId(
  prisma: PrismaClient
): Promise<bigint> {
  const unit = await prisma.rateMeasurementUnit.findFirst({
    select: { id: true },
  });

  if (!unit) {
    throw new Error(
      "No rate measurement units found in database. " +
        "Please ensure the database is properly seeded."
    );
  }

  return unit.id;
}
