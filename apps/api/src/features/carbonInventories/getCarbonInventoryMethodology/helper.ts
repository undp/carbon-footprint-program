import {
  Prisma,
  type PrismaClient,
  MeasurementUnitStatus,
} from "@repo/database";
import { DataIntegrityError } from "@/errors/index.js";

type RateMeasurementUnitWithMagnitudes = Prisma.RateMeasurementUnitGetPayload<{
  select: {
    id: true;
    numeratorMeasurementUnit: {
      select: {
        id: true;
        magnitudeId: true;
        baseFactor: true;
      };
    };
    denominatorMeasurementUnit: {
      select: {
        id: true;
        magnitudeId: true;
        baseFactor: true;
      };
    };
  };
}>;

type EmissionFactorWithRateUnit = Prisma.EmissionFactorGetPayload<{
  select: {
    id: true;
    dimensionValue1Id: true;
    dimensionValue2Id: true;
    rateMeasurementUnitId: true;
    source: true;
    year: true;
    gasDetails: true;
    value: true;
    rateMeasurementUnit: {
      select: {
        id: true;
        numeratorMeasurementUnit: {
          select: {
            id: true;
            magnitudeId: true;
            baseFactor: true;
          };
        };
        denominatorMeasurementUnit: {
          select: {
            id: true;
            magnitudeId: true;
            baseFactor: true;
          };
        };
      };
    };
  };
}>;

type ConvertedEmissionFactor = {
  id: string;
  originalEmissionFactorId: string | null;
  /**
   * The canonical `emission_factor` row this item represents, set on the
   * original and on every converted representation of it. A converted unit is a
   * different way of writing one catalog factor, not a second catalog identity,
   * so this is what a line-sync CATALOG selection sends.
   */
  baseEmissionFactorId: string;
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  rateMeasurementUnitId: string;
  source: string;
  year: number | null;
  gasDetails: Prisma.JsonValue;
  value: string;
};

/**
 * Converts an emission factor value between rate units, in decimal arithmetic.
 * Formula: new_value = original_value * (original_num_baseFactor * new_den_baseFactor) / (original_den_baseFactor * new_num_baseFactor)
 *
 * This is the real implementation. `convertEmissionFactorValue` is the same
 * conversion for callers that already hold a string and only display the result;
 * it goes through a double and can round a value the column can hold. Anything
 * that *persists* the result has to use this one, because a rounded applied
 * factor becomes a rounded stored emission with no way back to the original.
 */
export const convertEmissionFactorValueDecimal = (
  originalValue: Prisma.Decimal,
  originalNumBaseFactor: number,
  originalDenBaseFactor: number,
  newNumBaseFactor: number,
  newDenBaseFactor: number
): Prisma.Decimal => {
  assertUsableBaseFactors(
    originalNumBaseFactor,
    originalDenBaseFactor,
    newNumBaseFactor,
    newDenBaseFactor
  );

  return originalValue
    .mul(new Prisma.Decimal(originalNumBaseFactor))
    .mul(new Prisma.Decimal(newDenBaseFactor))
    .div(new Prisma.Decimal(originalDenBaseFactor))
    .div(new Prisma.Decimal(newNumBaseFactor));
};

/**
 * The base-factor preconditions shared by both conversions: every factor must be
 * finite, and the two that end up in a denominator must not be zero.
 */
const assertUsableBaseFactors = (
  originalNumBaseFactor: number,
  originalDenBaseFactor: number,
  newNumBaseFactor: number,
  newDenBaseFactor: number
): void => {
  // Validate originalNumBaseFactor: must be finite
  if (!Number.isFinite(originalNumBaseFactor)) {
    throw new DataIntegrityError(
      `Invalid originalNumBaseFactor: ${originalNumBaseFactor} is not a finite number`
    );
  }

  // Validate originalDenBaseFactor: must be non-zero and finite
  if (!Number.isFinite(originalDenBaseFactor)) {
    throw new DataIntegrityError(
      `Invalid originalDenBaseFactor: ${originalDenBaseFactor} is not a finite number`
    );
  }
  if (originalDenBaseFactor === 0) {
    throw new DataIntegrityError(
      `Invalid originalDenBaseFactor: ${originalDenBaseFactor} cannot be zero (division by zero)`
    );
  }

  // Validate newNumBaseFactor: must be non-zero and finite
  if (!Number.isFinite(newNumBaseFactor)) {
    throw new DataIntegrityError(
      `Invalid newNumBaseFactor: ${newNumBaseFactor} is not a finite number`
    );
  }
  if (newNumBaseFactor === 0) {
    throw new DataIntegrityError(
      `Invalid newNumBaseFactor: ${newNumBaseFactor} cannot be zero (division by zero)`
    );
  }

  // Validate newDenBaseFactor: must be finite
  if (!Number.isFinite(newDenBaseFactor)) {
    throw new DataIntegrityError(
      `Invalid newDenBaseFactor: ${newDenBaseFactor} is not a finite number`
    );
  }
};

/**
 * Converts an emission factor value between rate units, as a string.
 *
 * The read path builds every unit representation of every factor on each
 * request, so it takes the string form. It delegates to the decimal conversion
 * and only stringifies at the end — the value is never turned into a double.
 */
export const convertEmissionFactorValue = (
  originalValue: string,
  originalNumBaseFactor: number,
  originalDenBaseFactor: number,
  newNumBaseFactor: number,
  newDenBaseFactor: number
): string => {
  let value: Prisma.Decimal;
  try {
    value = new Prisma.Decimal(originalValue);
  } catch {
    throw new DataIntegrityError(
      `Invalid originalValue: "${originalValue}" cannot be parsed as a number (NaN)`
    );
  }
  if (!value.isFinite()) {
    throw new DataIntegrityError(
      `Invalid originalValue: "${originalValue}" is not a finite number`
    );
  }

  const convertedValue = convertEmissionFactorValueDecimal(
    value,
    originalNumBaseFactor,
    originalDenBaseFactor,
    newNumBaseFactor,
    newDenBaseFactor
  );

  // Validate the result is finite before returning
  if (!convertedValue.isFinite()) {
    throw new DataIntegrityError(
      `Conversion result is not finite: ${convertedValue.toString()} (computed from originalValue=${originalValue}, originalNumBaseFactor=${originalNumBaseFactor}, originalDenBaseFactor=${originalDenBaseFactor}, newNumBaseFactor=${newNumBaseFactor}, newDenBaseFactor=${newDenBaseFactor})`
    );
  }

  return convertedValue.toString();
};

/**
 * Generates all converted emission factors for a given emission factor.
 * Returns the original emission factor with originalEmissionFactorId = null,
 * and all converted factors with originalEmissionFactorId pointing to the original.
 * Converted factors use a composite ID: `${originalId}-${rateMeasurementUnitId}`
 */
export const generateConvertedEmissionFactors = (
  emissionFactor: EmissionFactorWithRateUnit,
  rateUnitsByMagnitude: Map<string, RateMeasurementUnitWithMagnitudes[]>
): ConvertedEmissionFactor[] => {
  const originalId = emissionFactor.id.toString();
  const originalRateUnit = emissionFactor.rateMeasurementUnit;

  // Validate emissionFactor.value before attempting conversions
  const valueString = emissionFactor.value.toString().trim();
  const parsedValue = Number.parseFloat(valueString);
  if (!Number.isFinite(parsedValue)) {
    throw new DataIntegrityError(
      `Invalid emission factor value for emission factor ${emissionFactor.id}: "${emissionFactor.value.toString()}" is not a valid finite number`
    );
  }

  // Always include the original emission factor first
  const result: ConvertedEmissionFactor[] = [
    {
      id: originalId,
      originalEmissionFactorId: null,
      baseEmissionFactorId: originalId,
      dimensionValue1Id: emissionFactor.dimensionValue1Id?.toString() ?? null,
      dimensionValue2Id: emissionFactor.dimensionValue2Id?.toString() ?? null,
      rateMeasurementUnitId: emissionFactor.rateMeasurementUnitId.toString(),
      source: emissionFactor.source,
      year: emissionFactor.year,
      gasDetails: emissionFactor.gasDetails,
      value: emissionFactor.value.toString(),
    },
  ];

  if (!originalRateUnit) {
    // If no rate unit info, return just the original
    return result;
  }

  const numeratorMagnitudeId =
    originalRateUnit.numeratorMeasurementUnit.magnitudeId;
  const denominatorMagnitudeId =
    originalRateUnit.denominatorMeasurementUnit.magnitudeId;
  const key = `${numeratorMagnitudeId}-${denominatorMagnitudeId}`;

  const compatibleRateUnits = rateUnitsByMagnitude.get(key) ?? [];

  const originalNumBaseFactor =
    originalRateUnit.numeratorMeasurementUnit.baseFactor;
  const originalDenBaseFactor =
    originalRateUnit.denominatorMeasurementUnit.baseFactor;

  // Generate converted factors for all compatible rate units
  // Skip the original rate unit to avoid duplicates
  const convertedFactors = compatibleRateUnits
    .filter(
      (rateUnit) =>
        rateUnit.id.toString() !==
        emissionFactor.rateMeasurementUnitId.toString()
    )
    .map((rateUnit) => {
      const newNumBaseFactor = rateUnit.numeratorMeasurementUnit.baseFactor;
      const newDenBaseFactor = rateUnit.denominatorMeasurementUnit.baseFactor;

      const convertedValue = convertEmissionFactorValue(
        emissionFactor.value.toString(),
        originalNumBaseFactor,
        originalDenBaseFactor,
        newNumBaseFactor,
        newDenBaseFactor
      );

      return {
        id: `${originalId}-${rateUnit.id.toString()}`, // Composite ID for uniqueness
        originalEmissionFactorId: originalId,
        baseEmissionFactorId: originalId,
        dimensionValue1Id: emissionFactor.dimensionValue1Id?.toString() ?? null,
        dimensionValue2Id: emissionFactor.dimensionValue2Id?.toString() ?? null,
        rateMeasurementUnitId: rateUnit.id.toString(),
        // Source and year describe the catalog vintage, so they follow the
        // factor through every unit it is expressed in.
        source: emissionFactor.source,
        year: emissionFactor.year,
        gasDetails: emissionFactor.gasDetails,
        value: convertedValue,
      };
    });

  return [...result, ...convertedFactors];
};

/**
 * Fetches all rate measurement units and groups them by magnitude combination.
 * Returns a map where the key is `${numeratorMagnitude}-${denominatorMagnitude}`
 * and the value is an array of rate measurement units with that magnitude combination.
 */
export const buildRateUnitsByMagnitudeMap = async (
  prismaClient: PrismaClient
): Promise<Map<string, RateMeasurementUnitWithMagnitudes[]>> => {
  const allRateMeasurementUnits =
    await prismaClient.rateMeasurementUnit.findMany({
      where: { status: MeasurementUnitStatus.ACTIVE },
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
    });

  const rateUnitsByMagnitude = new Map<
    string,
    RateMeasurementUnitWithMagnitudes[]
  >();

  for (const rateUnit of allRateMeasurementUnits) {
    const key = `${rateUnit.numeratorMeasurementUnit.magnitudeId}-${rateUnit.denominatorMeasurementUnit.magnitudeId}`;
    if (!rateUnitsByMagnitude.has(key)) {
      rateUnitsByMagnitude.set(key, []);
    }
    rateUnitsByMagnitude.get(key)!.push(rateUnit);
  }

  return rateUnitsByMagnitude;
};
