import { InputType, Prisma, type PrismaClient } from "@repo/database";
import type { UpdateCarbonInventoryLinesRequest } from "@repo/types";
import { convertEmissionFactorValue } from "../getCarbonInventoryMethodology/getCarbonInventoryMethodologyHelper.js";
import { bigIntEquals, mapBigIntField } from "@/utils/bigint.js";
import { decimalEquals, mapDecimalField } from "@/utils/decimal.js";
import { stringEquals } from "@/utils/string.js";

type SubcategoryWithDimensionsAndValues = Prisma.SubcategoryGetPayload<{
  include: {
    dimensions: {
      include: {
        values: true;
      };
    };
  };
}>;

export type ValidationError =
  | "LINE_NOT_FOUND"
  | "LINE_NOT_IN_CARBON_INVENTORY"
  | "SUBCATEGORY_NOT_FOUND"
  | "INVALID_DIMENSION_ID"
  | "INVALID_DIMENSION_VALUE_ID"
  | "DIMENSION_VALUE_NOT_IN_DIMENSION"
  | "MEASUREMENT_UNIT_NOT_FOUND"
  | "RATE_MEASUREMENT_UNIT_NOT_FOUND"
  | "MEASUREMENT_UNIT_ABBREVIATION_MISMATCH"
  | "EMISSION_FACTOR_NOT_FOUND"
  | "EMISSION_FACTOR_NOT_IN_SUBCATEGORY"
  | "EMISSION_FACTOR_DIMENSION_MISMATCH"
  | "EMISSION_FACTOR_SOURCE_MISMATCH"
  | "EMISSION_FACTOR_VALUE_MISMATCH";

type ValidationResult =
  | { success: true }
  | { success: false; error: ValidationError };

type Line = {
  id: bigint;
  subcategoryId: bigint;
};

/**
 * Validates that all required subcategories exist in the provided map
 */
export function validateAllSubcategoriesExist(
  lines: Line[],
  subcategoryMap: Map<string, SubcategoryWithDimensionsAndValues>
): ValidationResult {
  for (const line of lines) {
    const subcategoryIdStr = line.subcategoryId.toString();
    if (!subcategoryMap.has(subcategoryIdStr)) {
      return {
        success: false,
        error: "SUBCATEGORY_NOT_FOUND",
      };
    }
  }

  return { success: true };
}

/**
 * Validates that all lines exist and belong to the specified carbon inventory
 */
export async function validateLinesExistAndBelongToInventory(
  prismaClient: PrismaClient,
  lineIds: bigint[],
  foundLines: Line[]
): Promise<ValidationResult> {
  if (foundLines.length !== lineIds.length) {
    const foundLineIds = new Set(foundLines.map((l) => l.id.toString()));

    const missingLineIds = lineIds.filter(
      (id) => !foundLineIds.has(id.toString())
    );

    // Check if any missing lines exist but don't belong to this inventory
    const missingLines = await prismaClient.carbonInventoryLine.findMany({
      where: {
        id: { in: missingLineIds },
      },
      select: {
        id: true,
        carbonInventoryId: true,
      },
    });

    if (missingLines.length > 0) {
      return { success: false, error: "LINE_NOT_IN_CARBON_INVENTORY" };
    }

    return { success: false, error: "LINE_NOT_FOUND" };
  }

  return { success: true };
}

/**
 * Validates dimensions and dimension values for each line
 */
export function validateDimensionsAndValues(
  lines: Line[],
  request: UpdateCarbonInventoryLinesRequest,
  subcategoryMap: Map<string, SubcategoryWithDimensionsAndValues>
): ValidationResult {
  // Create a map of line data by line ID for quick lookup
  const lineDataMap = new Map(request.map((item) => [item.id, item]));

  for (const line of lines) {
    const lineData = lineDataMap.get(line.id.toString());
    if (!lineData) continue;

    // Skip validation if both dimension values are null
    if (
      lineData.dimensionValue1Id === null &&
      lineData.dimensionValue2Id === null
    ) {
      continue;
    }

    const subcategory = subcategoryMap.get(line.subcategoryId.toString());
    if (!subcategory) {
      // This shouldn't happen if subcategories were fetched correctly
      continue;
    }

    // Validate dimensionValue1Id if provided
    if (lineData.dimensionValue1Id !== null) {
      const dimension1 = subcategory.dimensions.find((d) => d.position === 1);
      if (!dimension1) {
        return {
          success: false,
          error: "INVALID_DIMENSION_ID",
        };
      }

      const dimensionValue = dimension1.values.find(
        (v) => v.id.toString() === lineData.dimensionValue1Id
      );
      if (!dimensionValue) {
        return {
          success: false,
          error: "INVALID_DIMENSION_VALUE_ID",
        };
      }
    }

    // Validate dimensionValue2Id if provided
    if (lineData.dimensionValue2Id !== null) {
      const dimension2 = subcategory.dimensions.find((d) => d.position === 2);
      if (!dimension2) {
        return {
          success: false,
          error: "INVALID_DIMENSION_ID",
        };
      }

      const dimensionValue = dimension2.values.find(
        (v) => v.id.toString() === lineData.dimensionValue2Id
      );
      if (!dimensionValue) {
        return {
          success: false,
          error: "INVALID_DIMENSION_VALUE_ID",
        };
      }
    }
  }

  return { success: true };
}

/**
 * Validates measurement units and rate measurement units consistency
 */
export async function validateMeasurementUnits(
  prismaClient: PrismaClient,
  request: UpdateCarbonInventoryLinesRequest
): Promise<ValidationResult> {
  // Collect all unique measurement unit and rate measurement unit IDs
  const measurementUnitIds = new Set<string>();
  const rateMeasurementUnitIds = new Set<string>();

  for (const lineData of request) {
    if (lineData.measurementUnitId !== null) {
      measurementUnitIds.add(lineData.measurementUnitId);
    }
    if (lineData.appliedFactorRateMeasurementUnitId !== null) {
      rateMeasurementUnitIds.add(lineData.appliedFactorRateMeasurementUnitId);
    }
  }

  // Fetch all measurement units
  const measurementUnits =
    measurementUnitIds.size > 0
      ? await prismaClient.measurementUnit.findMany({
          where: {
            id: { in: Array.from(measurementUnitIds).map(BigInt) },
          },
          select: {
            id: true,
            abbreviation: true,
          },
        })
      : [];

  // Fetch all rate measurement units with their denominator units
  const rateMeasurementUnits =
    rateMeasurementUnitIds.size > 0
      ? await prismaClient.rateMeasurementUnit.findMany({
          where: {
            id: { in: Array.from(rateMeasurementUnitIds).map(BigInt) },
          },
          include: {
            denominatorMeasurementUnit: {
              select: {
                id: true,
                abbreviation: true,
              },
            },
          },
        })
      : [];

  // Create maps for quick lookup
  const measurementUnitMap = new Map(
    measurementUnits.map((mu) => [mu.id.toString(), mu])
  );
  const rateMeasurementUnitMap = new Map(
    rateMeasurementUnits.map((rmu) => [rmu.id.toString(), rmu])
  );

  // Validate measurement unit and rate measurement unit consistency
  for (const lineData of request) {
    if (
      !lineData.measurementUnitId ||
      !lineData.appliedFactorRateMeasurementUnitId
    ) {
      continue;
    }

    const measurementUnit = measurementUnitMap.get(lineData.measurementUnitId);
    const rateMeasurementUnit = rateMeasurementUnitMap.get(
      lineData.appliedFactorRateMeasurementUnitId
    );

    if (!measurementUnit) {
      return { success: false, error: "MEASUREMENT_UNIT_NOT_FOUND" };
    }

    if (!rateMeasurementUnit) {
      return {
        success: false,
        error: "RATE_MEASUREMENT_UNIT_NOT_FOUND",
      };
    }

    // Check if measurement unit abbreviation matches denominator abbreviation
    if (
      measurementUnit.abbreviation !==
      rateMeasurementUnit.denominatorMeasurementUnit.abbreviation
    ) {
      return {
        success: false,
        error: "MEASUREMENT_UNIT_ABBREVIATION_MISMATCH",
      };
    }
  }

  return { success: true };
}

/**
 * Validates emission factors exist and belong to correct subcategories
 */
export async function validateEmissionFactors(
  prismaClient: PrismaClient,
  request: UpdateCarbonInventoryLinesRequest,
  lines: Line[],
  subcategoryMap: Map<string, SubcategoryWithDimensionsAndValues>
): Promise<ValidationResult> {
  // Collect all unique emission factor IDs and applied rate measurement unit IDs
  const emissionFactorIds = new Set<string>();
  const appliedRateMeasurementUnitIds = new Set<string>();

  for (const lineData of request) {
    if (lineData.baseFactorId !== null) {
      emissionFactorIds.add(lineData.baseFactorId);
    }
    if (lineData.appliedFactorRateMeasurementUnitId !== null) {
      appliedRateMeasurementUnitIds.add(
        lineData.appliedFactorRateMeasurementUnitId
      );
    }
  }

  // If no emission factors to validate, return success
  if (emissionFactorIds.size === 0) {
    return { success: true };
  }

  // Fetch all emission factors with their value, source, and rate measurement unit details
  const emissionFactors = await prismaClient.emissionFactor.findMany({
    where: {
      id: { in: Array.from(emissionFactorIds).map(BigInt) },
    },
    select: {
      id: true,
      subcategoryId: true,
      dimensionValue1Id: true,
      dimensionValue2Id: true,
      value: true,
      source: true,
      rateMeasurementUnit: {
        select: {
          id: true,
          numeratorMeasurementUnit: {
            select: {
              id: true,
              baseFactor: true,
            },
          },
          denominatorMeasurementUnit: {
            select: {
              id: true,
              baseFactor: true,
            },
          },
        },
      },
    },
  });

  // Fetch all applied rate measurement units with their numerator/denominator details
  const appliedRateMeasurementUnits =
    appliedRateMeasurementUnitIds.size > 0
      ? await prismaClient.rateMeasurementUnit.findMany({
          where: {
            id: { in: Array.from(appliedRateMeasurementUnitIds).map(BigInt) },
          },
          select: {
            id: true,
            numeratorMeasurementUnit: {
              select: {
                id: true,
                baseFactor: true,
              },
            },
            denominatorMeasurementUnit: {
              select: {
                id: true,
                baseFactor: true,
              },
            },
          },
        })
      : [];

  const emissionFactorMap = new Map(
    emissionFactors.map((ef) => [ef.id.toString(), ef])
  );
  const appliedRateMeasurementUnitMap = new Map(
    appliedRateMeasurementUnits.map((rmu) => [rmu.id.toString(), rmu])
  );

  // Create a map of lines by ID for quick lookup
  const lineMap = new Map(lines.map((l) => [l.id.toString(), l]));

  // Validate all emission factors exist and belong to correct subcategories
  for (const lineData of request) {
    if (lineData.baseFactorId === null) continue;

    const emissionFactor = emissionFactorMap.get(lineData.baseFactorId);
    if (!emissionFactor) {
      return { success: false, error: "EMISSION_FACTOR_NOT_FOUND" };
    }

    const line = lineMap.get(lineData.id);
    if (line) {
      // Safe assertion: subcategory exists (validated above)
      const subcategory = subcategoryMap.get(line.subcategoryId.toString())!;

      if (!bigIntEquals(emissionFactor.subcategoryId, subcategory.id)) {
        return {
          success: false,
          error: "EMISSION_FACTOR_NOT_IN_SUBCATEGORY",
        };
      }

      // Extract selection1Id and selection2Id from dimension fields
      const selection1Id = mapBigIntField(lineData.dimensionValue1Id);
      const selection2Id = mapBigIntField(lineData.dimensionValue2Id);

      // Validate that emission factor dimension values match the dimensions from the request
      const efDimension1Id =
        emissionFactor.dimensionValue1Id?.toString() ?? null;
      const efDimension2Id =
        emissionFactor.dimensionValue2Id?.toString() ?? null;
      const reqSelection1Id = selection1Id?.toString() ?? null;
      const reqSelection2Id = selection2Id?.toString() ?? null;

      if (
        !stringEquals(efDimension1Id, reqSelection1Id) ||
        !stringEquals(efDimension2Id, reqSelection2Id)
      ) {
        return {
          success: false,
          error: "EMISSION_FACTOR_DIMENSION_MISMATCH",
        };
      }

      // Validate factorSource matches emission factor source (unless it's "Factor Propio")
      if (
        lineData.factorSource !== null &&
        lineData.factorSource !== "Factor Propio" &&
        lineData.factorSource !== emissionFactor.source
      ) {
        return {
          success: false,
          error: "EMISSION_FACTOR_SOURCE_MISMATCH",
        };
      }

      // Validate appliedFactorValue consistency with converted emission factor value
      if (
        lineData.appliedFactorValue !== null &&
        lineData.appliedFactorRateMeasurementUnitId !== null &&
        emissionFactor.rateMeasurementUnit &&
        emissionFactor.value
      ) {
        const appliedRateUnit = appliedRateMeasurementUnitMap.get(
          lineData.appliedFactorRateMeasurementUnitId
        );

        if (!appliedRateUnit) {
          // This should have been caught by validateMeasurementUnits, but handle it here too
          return {
            success: false,
            error: "RATE_MEASUREMENT_UNIT_NOT_FOUND",
          };
        }

        // Convert the emission factor value to the applied rate measurement unit
        const originalValue = emissionFactor.value.toString();
        const originalNumBaseFactor =
          emissionFactor.rateMeasurementUnit.numeratorMeasurementUnit
            .baseFactor;
        const originalDenBaseFactor =
          emissionFactor.rateMeasurementUnit.denominatorMeasurementUnit
            .baseFactor;
        const newNumBaseFactor =
          appliedRateUnit.numeratorMeasurementUnit.baseFactor;
        const newDenBaseFactor =
          appliedRateUnit.denominatorMeasurementUnit.baseFactor;

        try {
          const convertedValue = convertEmissionFactorValue(
            originalValue,
            originalNumBaseFactor,
            originalDenBaseFactor,
            newNumBaseFactor,
            newDenBaseFactor
          );

          // Compare the converted value with the appliedFactorValue using Prisma.Decimal
          // to avoid floating-point precision issues
          const convertedValueDecimal = new Prisma.Decimal(convertedValue);
          const appliedValueDecimal = mapDecimalField(
            lineData.appliedFactorValue
          );

          if (!decimalEquals(convertedValueDecimal, appliedValueDecimal)) {
            return {
              success: false,
              error: "EMISSION_FACTOR_VALUE_MISMATCH",
            };
          }
        } catch {
          // If conversion fails, treat it as a mismatch
          return {
            success: false,
            error: "EMISSION_FACTOR_VALUE_MISMATCH",
          };
        }
      }
    }
  }

  return { success: true };
}

export type ActiveInputWithFactorAndResult =
  Prisma.CarbonInventoryLineInputGetPayload<{
    include: {
      factor: true;
      result: true;
    };
  }>;

/**
 * Checks if the incoming request data matches the current active input
 */
export function isInputDataUnchanged(
  lineData: UpdateCarbonInventoryLinesRequest[number],
  currentInput: ActiveInputWithFactorAndResult,
  inputType: InputType,
  selection1Id: bigint | null,
  selection2Id: bigint | null
): boolean {
  // Compare input type
  if (currentInput.inputType !== inputType) {
    return false;
  }

  // Compare selections
  if (!bigIntEquals(currentInput.selection1Id, selection1Id)) {
    return false;
  }
  if (!bigIntEquals(currentInput.selection2Id, selection2Id)) {
    return false;
  }

  // Compare quantity
  const newQuantity = mapDecimalField(lineData.quantity);
  if (!decimalEquals(currentInput.quantity, newQuantity)) {
    return false;
  }

  // Compare measurement unit
  const newMeasurementUnitId = mapBigIntField(lineData.measurementUnitId);
  if (!bigIntEquals(currentInput.measurementUnitId, newMeasurementUnitId)) {
    return false;
  }

  // Compare direct total emissions
  const newDirectTotalEmissions = mapDecimalField(
    lineData.manualTotalEmissions
  );
  if (
    !decimalEquals(currentInput.directTotalEmissions, newDirectTotalEmissions)
  ) {
    return false;
  }

  // Compare manual factor fields
  const newManualFactor =
    lineData.appliedFactorValue !== null &&
    lineData.factorSource === "Factor Propio"
      ? mapDecimalField(lineData.appliedFactorValue)
      : null;
  if (!decimalEquals(currentInput.manualFactor, newManualFactor)) {
    return false;
  }

  const newManualFactorSource =
    lineData.factorSource === "Factor Propio" ? lineData.factorSource : null;
  if (!stringEquals(currentInput.manualFactorSource, newManualFactorSource)) {
    return false;
  }

  const newManualFactorRateUnitId =
    lineData.appliedFactorRateMeasurementUnitId !== null &&
    lineData.factorSource === "Factor Propio"
      ? BigInt(lineData.appliedFactorRateMeasurementUnitId)
      : null;
  if (
    !bigIntEquals(
      currentInput.manualFactorRateUnitId,
      newManualFactorRateUnitId
    )
  ) {
    return false;
  }

  // Compare comment
  if (!stringEquals(currentInput.comment, lineData.comment ?? null)) {
    return false;
  }

  // Compare factor
  // Factor is created for DETAILED line input type.
  // emissionFactorId is derived from baseFactorId (null when factorSource is "Factor Propio").
  if (
    lineData.appliedFactorValue !== null &&
    lineData.appliedFactorRateMeasurementUnitId !== null
  ) {
    if (!currentInput.factor) return false;

    const newEmissionFactorId = mapBigIntField(lineData.baseFactorId);
    if (
      !bigIntEquals(currentInput.factor.emissionFactorId, newEmissionFactorId)
    ) {
      return false;
    }

    const newAppliedFactorValue = mapDecimalField(lineData.appliedFactorValue);
    if (
      !decimalEquals(
        currentInput.factor.appliedFactorValue,
        newAppliedFactorValue
      )
    ) {
      return false;
    }

    const newAppliedFactorRateUnitId = BigInt(
      lineData.appliedFactorRateMeasurementUnitId
    );
    if (
      currentInput.factor.appliedFactorRateUnitId !== newAppliedFactorRateUnitId
    ) {
      return false;
    }

    const newAppliedFactorSource = lineData.factorSource;
    if (
      !stringEquals(
        currentInput.factor.appliedFactorSource,
        newAppliedFactorSource
      )
    ) {
      return false;
    }
  } else {
    // Should not have factor (no factor data provided)
    if (currentInput.factor !== null) {
      return false;
    }
  }

  // Compare result (total emissions)
  let newTotalEmissions: Prisma.Decimal | null = null;

  if (
    inputType === InputType.DIRECT &&
    lineData.manualTotalEmissions !== null
  ) {
    newTotalEmissions = mapDecimalField(lineData.manualTotalEmissions);
  } else if (
    inputType === InputType.DETAILED &&
    lineData.quantity !== null &&
    lineData.appliedFactorValue !== null
  ) {
    newTotalEmissions = mapDecimalField(lineData.quantity).mul(
      mapDecimalField(lineData.appliedFactorValue)
    );
  }

  if (newTotalEmissions !== null) {
    if (!currentInput.result) {
      return false;
    }
    if (!decimalEquals(currentInput.result.totalEmissions, newTotalEmissions)) {
      return false;
    }
  } else {
    // Should not have result
    if (currentInput.result !== null) {
      return false;
    }
  }

  return true;
}
