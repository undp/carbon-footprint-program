import type { PrismaClient } from "@repo/database";
import { z } from "zod";

export type RateMeasurementUnitWithMagnitudes = {
  id: bigint;
  numeratorMeasurementUnit: {
    id: bigint;
    magnitude: string;
    baseFactor: number;
  };
  denominatorMeasurementUnit: {
    id: bigint;
    magnitude: string;
    baseFactor: number;
  };
};

export type EmissionFactorWithRateUnit = {
  id: bigint;
  dimensionValue1Id: bigint | null;
  dimensionValue2Id: bigint | null;
  rateMeasurementUnitId: bigint;
  source: string;
  gasDetails: unknown;
  value: { toString(): string } | string | number;
  rateMeasurementUnit: {
    id: bigint;
    numeratorMeasurementUnit: {
      id: bigint;
      magnitude: string;
      baseFactor: number;
    };
    denominatorMeasurementUnit: {
      id: bigint;
      magnitude: string;
      baseFactor: number;
    };
  } | null;
};

export type ConvertedEmissionFactor = {
  id: string;
  originalEmissionFactorId: string | null;
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  rateMeasurementUnitId: string;
  source: string;
  gasDetails: z.infer<ReturnType<typeof z.json>>;
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
  const value = Number.parseFloat(originalValue);
  // Convert to base units, then to new units
  const convertedValue =
    (value * originalNumBaseFactor * newDenBaseFactor) /
    (originalDenBaseFactor * newNumBaseFactor);
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

  // Always include the original emission factor first
  const result: ConvertedEmissionFactor[] = [
    {
      id: originalId,
      originalEmissionFactorId: null,
      dimensionValue1Id: emissionFactor.dimensionValue1Id?.toString() ?? null,
      dimensionValue2Id: emissionFactor.dimensionValue2Id?.toString() ?? null,
      rateMeasurementUnitId: emissionFactor.rateMeasurementUnitId.toString(),
      source: emissionFactor.source,
      gasDetails: emissionFactor.gasDetails as z.infer<
        ReturnType<typeof z.json>
      >,
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
        gasDetails: emissionFactor.gasDetails as z.infer<
          ReturnType<typeof z.json>
        >,
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
