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
 *
 * The numerator/denominator magnitude pair is derived from the rate unit, the
 * same way every production write path derives it, so a factory-built factor
 * lands in the same unit family the unique index would put it in. Passing the
 * pair by hand is not offered: a wrong pair would silently make two factors in
 * one family look like two families.
 *
 * `year` defaults to null, meaning transversal. A test about vintages should say
 * which year it means.
 */
export async function createTestEmissionFactor(
  prisma: PrismaClient,
  subcategoryId: bigint,
  rateMeasurementUnitId: bigint,
  overrides?: Partial<{
    dimensionValue1Id: bigint | null;
    dimensionValue2Id: bigint | null;
    source: string;
    year: number | null;
    gasDetails: object;
    value: string;
    status: string;
  }>
): Promise<EmissionFactor> {
  const family = await resolveTestRateUnitMagnitudes(
    prisma,
    rateMeasurementUnitId
  );

  return await prisma.emissionFactor.create({
    data: {
      subcategoryId,
      dimensionValue1Id: overrides?.dimensionValue1Id ?? null,
      dimensionValue2Id: overrides?.dimensionValue2Id ?? null,
      rateMeasurementUnitId,
      source: overrides?.source ?? `Test Source`,
      year: overrides?.year ?? null,
      numeratorMagnitudeId: family.numeratorMagnitudeId,
      denominatorMagnitudeId: family.denominatorMagnitudeId,
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

/** The unit family of a rate unit, for tests that build factors directly. */
export async function resolveTestRateUnitMagnitudes(
  prisma: PrismaClient,
  rateMeasurementUnitId: bigint
): Promise<{ numeratorMagnitudeId: bigint; denominatorMagnitudeId: bigint }> {
  const rateUnit = await prisma.rateMeasurementUnit.findUnique({
    where: { id: rateMeasurementUnitId },
    select: {
      numeratorMeasurementUnit: { select: { magnitudeId: true } },
      denominatorMeasurementUnit: { select: { magnitudeId: true } },
    },
  });

  if (!rateUnit) {
    throw new Error(
      `Rate measurement unit ${rateMeasurementUnitId} not found. Ensure the database is seeded.`
    );
  }

  return {
    numeratorMagnitudeId: rateUnit.numeratorMeasurementUnit.magnitudeId,
    denominatorMagnitudeId: rateUnit.denominatorMeasurementUnit.magnitudeId,
  };
}

/**
 * Looks up a rate unit by abbreviation, for tests that need a specific unit
 * family (`kg/kg` and `kg/ton` are one family; `kg/kWh` is another).
 */
export async function getTestRateMeasurementUnitIdByAbbreviation(
  prisma: PrismaClient,
  abbreviation: string
): Promise<bigint> {
  const unit = await prisma.rateMeasurementUnit.findUnique({
    where: { abbreviation },
    select: { id: true },
  });

  if (!unit) {
    throw new Error(
      `Rate measurement unit '${abbreviation}' not found. Ensure the database is seeded.`
    );
  }

  return unit.id;
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
