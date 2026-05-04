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
        magnitude: true;
        baseFactor: true;
      };
    };
    denominatorMeasurementUnit: {
      select: {
        id: true;
        magnitude: true;
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
    gasDetails: true;
    value: true;
    rateMeasurementUnit: {
      select: {
        id: true;
        numeratorMeasurementUnit: {
          select: {
            id: true;
            magnitude: true;
            baseFactor: true;
          };
        };
        denominatorMeasurementUnit: {
          select: {
            id: true;
            magnitude: true;
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
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  rateMeasurementUnitId: string;
  source: string;
  gasDetails: Prisma.JsonValue;
  value: string;
};

/**
 * Converts an emission factor value between rate units using base factors.
 * Formula: new_value = original_value * (original_num_baseFactor * new_den_baseFactor) / (original_den_baseFactor * new_num_baseFactor)
 */
export const convertEmissionFactorValue = (
  originalValue: string,
  originalNumBaseFactor: number,
  originalDenBaseFactor: number,
  newNumBaseFactor: number,
  newDenBaseFactor: number
): string => {
  // Validate originalValue: parse and check if it's NaN or not finite
  const value = Number.parseFloat(originalValue);
  if (Number.isNaN(value)) {
    throw new DataIntegrityError(
      `Invalid originalValue: "${originalValue}" cannot be parsed as a number (NaN)`
    );
  }
  if (!Number.isFinite(value)) {
    throw new DataIntegrityError(
      `Invalid originalValue: "${originalValue}" is not a finite number`
    );
  }

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

  // Convert to base units, then to new units
  const convertedValue =
    (value * originalNumBaseFactor * newDenBaseFactor) /
    (originalDenBaseFactor * newNumBaseFactor);

  // Validate the result is finite before returning
  if (!Number.isFinite(convertedValue)) {
    throw new DataIntegrityError(
      `Conversion result is not finite: ${convertedValue} (computed from originalValue=${originalValue}, originalNumBaseFactor=${originalNumBaseFactor}, originalDenBaseFactor=${originalDenBaseFactor}, newNumBaseFactor=${newNumBaseFactor}, newDenBaseFactor=${newDenBaseFactor})`
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
      dimensionValue1Id: emissionFactor.dimensionValue1Id?.toString() ?? null,
      dimensionValue2Id: emissionFactor.dimensionValue2Id?.toString() ?? null,
      rateMeasurementUnitId: emissionFactor.rateMeasurementUnitId.toString(),
      source: emissionFactor.source,
      gasDetails: emissionFactor.gasDetails,
      value: emissionFactor.value.toString(),
    },
  ];

  if (!originalRateUnit) {
    // If no rate unit info, return just the original
    return result;
  }

  const numeratorMagnitude =
    originalRateUnit.numeratorMeasurementUnit.magnitude;
  const denominatorMagnitude =
    originalRateUnit.denominatorMeasurementUnit.magnitude;
  const key = `${numeratorMagnitude}-${denominatorMagnitude}`;

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
        dimensionValue1Id: emissionFactor.dimensionValue1Id?.toString() ?? null,
        dimensionValue2Id: emissionFactor.dimensionValue2Id?.toString() ?? null,
        rateMeasurementUnitId: rateUnit.id.toString(),
        source: emissionFactor.source,
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
            magnitude: true,
            baseFactor: true,
          },
        },
        denominatorMeasurementUnit: {
          select: {
            id: true,
            magnitude: true,
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
    const key = `${rateUnit.numeratorMeasurementUnit.magnitude}-${rateUnit.denominatorMeasurementUnit.magnitude}`;
    if (!rateUnitsByMagnitude.has(key)) {
      rateUnitsByMagnitude.set(key, []);
    }
    rateUnitsByMagnitude.get(key)!.push(rateUnit);
  }

  return rateUnitsByMagnitude;
};
