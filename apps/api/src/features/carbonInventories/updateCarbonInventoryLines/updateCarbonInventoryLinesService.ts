import type { InputType, PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";
import type { UpdateCarbonInventoryLinesRequest } from "@repo/types";
import type { UpdateCarbonInventoryLinesResponse } from "@repo/types";
import { mapLineToResponse } from "../mappers.js";
import {
  validateAllSubcategoriesExist,
  validateLinesExistAndBelongToInventory,
  validateDimensionsAndValues,
  validateMeasurementUnits,
  validateEmissionFactors,
  isInputDataUnchanged,
  extractDimensionSelections,
} from "./updateCarbonInventoryLinesHelper.js";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";

type SubcategoryWithDimensionsAndValues = Prisma.SubcategoryGetPayload<{
  include: {
    dimensions: {
      include: {
        values: true;
      };
    };
  };
}>;

export type UpdateCarbonInventoryLinesResult =
  | { success: true; data: UpdateCarbonInventoryLinesResponse }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
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
    };

/**
 * Determines the input type based on the provided data
 */
function determineInputType(
  data: UpdateCarbonInventoryLinesRequest[number]
): InputType {
  // If manualTotalEmissions is provided, it's DIRECT
  if (data.manualTotalEmissions !== null) {
    return "DIRECT";
  }

  // If factorSource is "Factor Propio", it's EXPERT
  if (data.factorSource === "Factor Propio") {
    return "EXPERT";
  }

  // If baseFactorId is provided, it's SIMPLIFIED
  if (data.baseFactorId !== null) {
    return "SIMPLIFIED";
  }

  // Default to SIMPLIFIED if we have quantity and factor data
  if (
    data.quantity !== null &&
    data.appliedFactorValue !== null &&
    data.appliedFactorRateMeasurementUnitId !== null
  ) {
    return "SIMPLIFIED";
  }

  // Default to EXPERT if we have factor data but no baseFactorId
  if (
    data.appliedFactorValue !== null &&
    data.appliedFactorRateMeasurementUnitId !== null
  ) {
    return "EXPERT";
  }

  // Empty line - default to SIMPLIFIED
  return "SIMPLIFIED";
}

export const updateCarbonInventoryLinesService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  request: UpdateCarbonInventoryLinesRequest
): Promise<UpdateCarbonInventoryLinesResult> => {
  // Validate carbon inventory exists
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: carbonInventoryId,
    },
    select: {
      id: true,
      methodologyVersionId: true,
    },
  });

  if (!carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  // Get all line IDs from the request
  const lineIds = request.map((item) => BigInt(item.id));

  // Fetch all lines without subcategories (to avoid duplicate data)
  // Include factor and result for comparison
  const lines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      id: { in: lineIds },
      carbonInventoryId,
    },
    select: {
      id: true,
      subcategoryId: true,
      inputs: {
        where: {
          isActive: true,
        },
        include: {
          factor: true,
          result: true,
        },
        take: 1,
      },
    },
  });

  // Collect unique subcategory IDs
  const subcategoryIds = Array.from(
    new Set(lines.map((line) => line.subcategoryId))
  );

  // Fetch subcategories with dimensions separately (no duplicates)
  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      id: { in: subcategoryIds },
    },
    include: {
      dimensions: {
        include: {
          values: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  // Create a map for quick subcategory lookup
  const subcategoryMap = new Map(
    subcategories.map((subcategory) => [subcategory.id.toString(), subcategory])
  );

  // Validate all subcategories exist
  const subcategoriesValidation = validateAllSubcategoriesExist(
    lines,
    subcategoryMap
  );
  if (!subcategoriesValidation.success) {
    return { success: false, error: subcategoriesValidation.error };
  }

  // Validate all lines exist and belong to the inventory
  const linesValidation = await validateLinesExistAndBelongToInventory(
    prismaClient,
    lineIds,
    lines
  );
  if (!linesValidation.success) {
    return { success: false, error: linesValidation.error };
  }

  // Validate dimensions and dimension values for each line
  const dimensionsValidation = validateDimensionsAndValues(
    lines,
    request,
    subcategoryMap
  );
  if (!dimensionsValidation.success) {
    return { success: false, error: dimensionsValidation.error };
  }

  // Validate measurement units and rate measurement units
  const measurementUnitsValidation = await validateMeasurementUnits(
    prismaClient,
    request
  );
  if (!measurementUnitsValidation.success) {
    return { success: false, error: measurementUnitsValidation.error };
  }

  // Validate emission factors
  const emissionFactorsValidation = await validateEmissionFactors(
    prismaClient,
    request,
    lines,
    subcategoryMap
  );
  if (!emissionFactorsValidation.success) {
    return { success: false, error: emissionFactorsValidation.error };
  }

  // Get ACTIVE status for lines
  const activeStatus = await prismaClient.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!activeStatus) {
    throw new Error("ACTIVE status not found in database");
  }

  // Create a map for quick line lookup (all lines validated above)
  const databaseLineMap = new Map(
    lines.map((line) => [line.id.toString(), line])
  );

  // Process each line update
  const updatedLines: Array<{
    line: (typeof lines)[number];
    subcategory: SubcategoryWithDimensionsAndValues;
  }> = [];

  for (const lineData of request) {
    // Safe assertion: all lines validated above
    const line = databaseLineMap.get(lineData.id)!;

    // Safe assertion: all subcategories validated above
    const subcategory = subcategoryMap.get(line.subcategoryId.toString())!;

    const inputType = determineInputType(lineData);

    // Extract dimension values based on position
    const { selection1Id, selection2Id } = extractDimensionSelections(
      lineData.dimensions,
      subcategory
    );

    // Check if there's an active input and if the data is unchanged
    const currentActiveInput = line.inputs[0] ?? null;
    if (currentActiveInput) {
      // If data is unchanged, skip creating a new input
      if (
        isInputDataUnchanged(
          lineData,
          currentActiveInput,
          inputType,
          selection1Id,
          selection2Id
        )
      ) {
        updatedLines.push({ line, subcategory });
        continue;
      }

      // Mark old active input as inactive
      await prismaClient.carbonInventoryLineInput.updateMany({
        where: {
          lineId: line.id,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedById: null, // TODO: Add updated by id from logged in user
        },
      });
    }

    // Create new input
    const newInput = await prismaClient.carbonInventoryLineInput.create({
      data: {
        lineId: line.id,
        inputType,
        selection1Id,
        selection2Id,
        quantity: mapDecimalField(lineData.quantity),
        measurementUnitId: mapBigIntField(lineData.measurementUnitId),
        directTotalEmissions: mapDecimalField(lineData.manualTotalEmissions),
        manualFactor:
          lineData.appliedFactorValue !== null &&
          lineData.factorSource === "Factor Propio"
            ? mapDecimalField(lineData.appliedFactorValue)
            : null,
        manualFactorSource:
          lineData.factorSource === "Factor Propio"
            ? lineData.factorSource
            : null,
        manualFactorRateUnitId:
          lineData.appliedFactorRateMeasurementUnitId !== null &&
          lineData.factorSource === "Factor Propio"
            ? BigInt(lineData.appliedFactorRateMeasurementUnitId)
            : null,
        comment: lineData.comment ?? null,
        isActive: true,
        createdById: null, // TODO: Add created by id from logged in user
        updatedById: null, // TODO: Add updated by id from logged in user
      },
    });

    // Create factor if applicable (for both SIMPLIFIED and EXPERT modes)
    // SIMPLIFIED: has emissionFactorId (from baseFactorId)
    // EXPERT: emissionFactorId is null (when factorSource is "Factor Propio")
    if (
      lineData.appliedFactorValue !== null &&
      lineData.appliedFactorRateMeasurementUnitId !== null
    ) {
      const emissionFactorId = mapBigIntField(lineData.baseFactorId);

      await prismaClient.carbonInventoryLineFactor.create({
        data: {
          lineInputId: newInput.id,
          emissionFactorId,
          appliedFactorValue: mapDecimalField(lineData.appliedFactorValue),
          appliedFactorRateUnitId: BigInt(
            lineData.appliedFactorRateMeasurementUnitId
          ),
          appliedFactorSource: lineData.factorSource,
          createdById: null, // TODO: Add created by id from logged in user
          updatedById: null, // TODO: Add updated by id from logged in user
        },
      });
    }

    // Create result if applicable
    // For SIMPLIFIED or EXPERT: quantity * appliedFactorValue
    // For DIRECT: manualTotalEmissions
    let totalEmissions: Prisma.Decimal | null = null;

    if (inputType === "DIRECT" && lineData.manualTotalEmissions !== null) {
      totalEmissions = mapDecimalField(lineData.manualTotalEmissions);
    } else if (
      (inputType === "SIMPLIFIED" || inputType === "EXPERT") &&
      lineData.quantity !== null &&
      lineData.appliedFactorValue !== null
    ) {
      totalEmissions = mapDecimalField(lineData.quantity).mul(
        mapDecimalField(lineData.appliedFactorValue)
      );
    }

    if (totalEmissions !== null) {
      await prismaClient.carbonInventoryLineResult.create({
        data: {
          lineInputId: newInput.id,
          totalEmissions,
          createdById: null, // TODO: Add created by id from logged in user
          updatedById: null, // TODO: Add updated by id from logged in user
        },
      });
    }

    updatedLines.push({ line, subcategory });
  }

  // Fetch updated lines with their inputs for response mapping
  const updatedLinesWithInputs =
    await prismaClient.carbonInventoryLine.findMany({
      where: {
        id: { in: lineIds },
      },
      include: {
        inputs: {
          where: {
            isActive: true,
          },
          include: {
            factor: true,
          },
          take: 1,
        },
      },
    });

  // Create a map for quick lookup
  const lineMap = new Map(
    updatedLinesWithInputs.map((line) => [line.id.toString(), line])
  );
  const lineToSubcategoryMap = new Map(
    updatedLines.map((ul) => [ul.line.id.toString(), ul.subcategory])
  );

  // Map lines to response in the same order as the request
  const response: UpdateCarbonInventoryLinesResponse = request.map(
    (lineData) => {
      const line = lineMap.get(lineData.id);
      const subcategory = lineToSubcategoryMap.get(lineData.id);

      if (!line) {
        throw new Error(`Line ${lineData.id} not found after update`);
      }

      if (!subcategory) {
        throw new Error(`Subcategory not found for line ${lineData.id}`);
      }

      return mapLineToResponse(line, subcategory);
    }
  );

  return { success: true, data: response };
};
