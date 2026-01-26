import type { PrismaClient, Prisma } from "@repo/database";
import type {
  SyncCarbonInventoryLinesRequest,
  SyncCarbonInventoryLinesResponse,
} from "@repo/types";
import { mapLineToResponse, type LineWithInputs } from "../mappers.js";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";

export type SyncCarbonInventoryLinesResult =
  | { success: true; data: SyncCarbonInventoryLinesResponse }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_IN_METHODOLOGY"
        | "LINE_NOT_FOUND"
        | "LINE_NOT_IN_CARBON_INVENTORY";
    };

/**
 * Determines the input type based on the provided data
 */
function determineInputType(data: {
  manualTotalEmissions: number | null;
  factorSource: string | null;
  baseFactorId: string | null;
  quantity: number | null;
  appliedFactorValue: number | null;
  appliedFactorRateMeasurementUnitId: string | null;
}): "DIRECT" | "SIMPLIFIED" | "EXPERT" {
  if (data.manualTotalEmissions !== null) {
    return "DIRECT";
  }
  if (data.factorSource === "Factor Propio") {
    return "EXPERT";
  }
  if (data.baseFactorId !== null) {
    return "SIMPLIFIED";
  }
  if (
    data.quantity !== null &&
    data.appliedFactorValue !== null &&
    data.appliedFactorRateMeasurementUnitId !== null
  ) {
    return "SIMPLIFIED";
  }
  if (
    data.appliedFactorValue !== null &&
    data.appliedFactorRateMeasurementUnitId !== null
  ) {
    return "EXPERT";
  }
  return "SIMPLIFIED";
}

export const syncCarbonInventoryLinesService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  request: SyncCarbonInventoryLinesRequest
): Promise<SyncCarbonInventoryLinesResult> => {
  // Validate carbon inventory exists
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: { id: carbonInventoryId },
    select: { id: true, methodologyVersionId: true },
  });

  if (!carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  // Get status IDs
  const [activeStatus, deletedStatus] = await Promise.all([
    prismaClient.statusCatalog.findFirst({
      where: { scope: "ENTITY", code: "ACTIVE" },
      select: { id: true },
    }),
    prismaClient.statusCatalog.findFirst({
      where: { scope: "ENTITY", code: "DELETED" },
      select: { id: true },
    }),
  ]);

  if (!activeStatus || !deletedStatus) {
    throw new Error("Required status codes not found in database");
  }

  // Validate subcategories for create operations
  if (request.create.length > 0) {
    const subcategoryIds = [
      ...new Set(request.create.map((item) => BigInt(item.subcategoryId))),
    ];

    const subcategories = await prismaClient.subcategory.findMany({
      where: { id: { in: subcategoryIds } },
      include: {
        category: { select: { methodologyVersionId: true } },
      },
    });

    const subcategoryMap = new Map(
      subcategories.map((s) => [s.id.toString(), s])
    );

    for (const item of request.create) {
      const subcategory = subcategoryMap.get(item.subcategoryId);
      if (!subcategory) {
        return { success: false, error: "SUBCATEGORY_NOT_FOUND" };
      }
      if (
        subcategory.category.methodologyVersionId !==
        carbonInventory.methodologyVersionId
      ) {
        return { success: false, error: "SUBCATEGORY_NOT_IN_METHODOLOGY" };
      }
    }
  }

  // Validate lines for update and delete operations
  const lineIdsToValidate = [
    ...request.update.map((item) => BigInt(item.id)),
    ...request.delete.map((item) => BigInt(item.id)),
  ];

  if (lineIdsToValidate.length > 0) {
    const existingLines = await prismaClient.carbonInventoryLine.findMany({
      where: {
        id: { in: lineIdsToValidate },
        statusId: activeStatus.id, // Only consider active lines
      },
      select: { id: true, carbonInventoryId: true },
    });

    const existingLineMap = new Map(
      existingLines.map((line) => [line.id.toString(), line])
    );

    for (const item of [...request.update, ...request.delete]) {
      const line = existingLineMap.get(item.id);
      if (!line) {
        return { success: false, error: "LINE_NOT_FOUND" };
      }
      if (line.carbonInventoryId !== carbonInventoryId) {
        return { success: false, error: "LINE_NOT_IN_CARBON_INVENTORY" };
      }
    }
  }

  // Execute all operations in a transaction
  const createdLineIds: bigint[] = [];
  const updatedLineIds: bigint[] = [];
  const deletedLineIds: string[] = [];

  await prismaClient.$transaction(async (tx) => {
    // 1. CREATE operations
    for (const createItem of request.create) {
      const line = await tx.carbonInventoryLine.create({
        data: {
          carbonInventoryId,
          subcategoryId: BigInt(createItem.subcategoryId),
          statusId: activeStatus.id,
          createdById: null,
          updatedById: null,
        },
      });

      createdLineIds.push(line.id);

      // Create input if there's data
      const hasInputData =
        createItem.dimensionValue1Id !== null ||
        createItem.dimensionValue2Id !== null ||
        createItem.quantity !== null ||
        createItem.measurementUnitId !== null ||
        createItem.factorSource !== null ||
        createItem.manualTotalEmissions !== null;

      if (hasInputData) {
        const inputType = determineInputType(createItem);

        const newInput = await tx.carbonInventoryLineInput.create({
          data: {
            lineId: line.id,
            inputType,
            selection1Id: mapBigIntField(createItem.dimensionValue1Id),
            selection2Id: mapBigIntField(createItem.dimensionValue2Id),
            quantity:
              createItem.quantity !== null
                ? mapDecimalField(createItem.quantity)
                : null,
            measurementUnitId: mapBigIntField(createItem.measurementUnitId),
            directTotalEmissions:
              createItem.manualTotalEmissions !== null
                ? mapDecimalField(createItem.manualTotalEmissions)
                : null,
            manualFactor:
              createItem.appliedFactorValue !== null &&
              createItem.factorSource === "Factor Propio"
                ? mapDecimalField(createItem.appliedFactorValue)
                : null,
            manualFactorSource:
              createItem.factorSource === "Factor Propio"
                ? createItem.factorSource
                : null,
            manualFactorRateUnitId:
              createItem.appliedFactorRateMeasurementUnitId !== null &&
              createItem.factorSource === "Factor Propio"
                ? BigInt(createItem.appliedFactorRateMeasurementUnitId)
                : null,
            comment: createItem.comment ?? null,
            isActive: true,
            createdById: null,
            updatedById: null,
          },
        });

        // Create factor if applicable
        if (
          createItem.appliedFactorValue !== null &&
          createItem.appliedFactorRateMeasurementUnitId !== null
        ) {
          await tx.carbonInventoryLineFactor.create({
            data: {
              lineInputId: newInput.id,
              emissionFactorId: mapBigIntField(createItem.baseFactorId),
              appliedFactorValue: mapDecimalField(
                createItem.appliedFactorValue
              ),
              appliedFactorRateUnitId: BigInt(
                createItem.appliedFactorRateMeasurementUnitId
              ),
              appliedFactorSource: createItem.factorSource,
              createdById: null,
              updatedById: null,
            },
          });
        }

        // Create result if applicable
        let totalEmissions: Prisma.Decimal | null = null;

        if (
          inputType === "DIRECT" &&
          createItem.manualTotalEmissions !== null
        ) {
          totalEmissions = mapDecimalField(createItem.manualTotalEmissions);
        } else if (
          (inputType === "SIMPLIFIED" || inputType === "EXPERT") &&
          createItem.quantity !== null &&
          createItem.appliedFactorValue !== null
        ) {
          totalEmissions = mapDecimalField(createItem.quantity).mul(
            mapDecimalField(createItem.appliedFactorValue)
          );
        }

        if (totalEmissions !== null) {
          await tx.carbonInventoryLineResult.create({
            data: {
              lineInputId: newInput.id,
              totalEmissions,
              createdById: null,
              updatedById: null,
            },
          });
        }
      }
    }

    // 2. UPDATE operations
    for (const updateItem of request.update) {
      const lineId = BigInt(updateItem.id);
      updatedLineIds.push(lineId);

      // Mark old active input as inactive
      await tx.carbonInventoryLineInput.updateMany({
        where: { lineId, isActive: true },
        data: { isActive: false, updatedById: null },
      });

      const inputType = determineInputType(updateItem);

      const newInput = await tx.carbonInventoryLineInput.create({
        data: {
          lineId,
          inputType,
          selection1Id: mapBigIntField(updateItem.dimensionValue1Id),
          selection2Id: mapBigIntField(updateItem.dimensionValue2Id),
          quantity:
            updateItem.quantity !== null
              ? mapDecimalField(updateItem.quantity)
              : null,
          measurementUnitId: mapBigIntField(updateItem.measurementUnitId),
          directTotalEmissions:
            updateItem.manualTotalEmissions !== null
              ? mapDecimalField(updateItem.manualTotalEmissions)
              : null,
          manualFactor:
            updateItem.appliedFactorValue !== null &&
            updateItem.factorSource === "Factor Propio"
              ? mapDecimalField(updateItem.appliedFactorValue)
              : null,
          manualFactorSource:
            updateItem.factorSource === "Factor Propio"
              ? updateItem.factorSource
              : null,
          manualFactorRateUnitId:
            updateItem.appliedFactorRateMeasurementUnitId !== null &&
            updateItem.factorSource === "Factor Propio"
              ? BigInt(updateItem.appliedFactorRateMeasurementUnitId)
              : null,
          comment: updateItem.comment ?? null,
          isActive: true,
          createdById: null,
          updatedById: null,
        },
      });

      // Create factor if applicable
      if (
        updateItem.appliedFactorValue !== null &&
        updateItem.appliedFactorRateMeasurementUnitId !== null
      ) {
        await tx.carbonInventoryLineFactor.create({
          data: {
            lineInputId: newInput.id,
            emissionFactorId: mapBigIntField(updateItem.baseFactorId),
            appliedFactorValue: mapDecimalField(updateItem.appliedFactorValue),
            appliedFactorRateUnitId: BigInt(
              updateItem.appliedFactorRateMeasurementUnitId
            ),
            appliedFactorSource: updateItem.factorSource,
            createdById: null,
            updatedById: null,
          },
        });
      }

      // Create result if applicable
      let totalEmissions: Prisma.Decimal | null = null;

      if (inputType === "DIRECT" && updateItem.manualTotalEmissions !== null) {
        totalEmissions = mapDecimalField(updateItem.manualTotalEmissions);
      } else if (
        (inputType === "SIMPLIFIED" || inputType === "EXPERT") &&
        updateItem.quantity !== null &&
        updateItem.appliedFactorValue !== null
      ) {
        totalEmissions = mapDecimalField(updateItem.quantity).mul(
          mapDecimalField(updateItem.appliedFactorValue)
        );
      }

      if (totalEmissions !== null) {
        await tx.carbonInventoryLineResult.create({
          data: {
            lineInputId: newInput.id,
            totalEmissions,
            createdById: null,
            updatedById: null,
          },
        });
      }
    }

    // 3. DELETE operations (soft delete)
    for (const deleteItem of request.delete) {
      await tx.carbonInventoryLine.update({
        where: { id: BigInt(deleteItem.id) },
        data: { statusId: deletedStatus.id, updatedById: null },
      });
      deletedLineIds.push(deleteItem.id);
    }
  });

  // Fetch created and updated lines for response
  const allLineIds = [...createdLineIds, ...updatedLineIds];
  let linesForResponse: LineWithInputs[] = [];

  if (allLineIds.length > 0) {
    linesForResponse = await prismaClient.carbonInventoryLine.findMany({
      where: { id: { in: allLineIds } },
      include: {
        inputs: {
          where: { isActive: true },
          include: { factor: true },
          take: 1,
        },
      },
    });
  }

  // Create maps for response ordering
  const lineMap = new Map(
    linesForResponse.map((line) => [line.id.toString(), line])
  );

  // Build response
  const createdLines = createdLineIds
    .map((id) => lineMap.get(id.toString()))
    .filter((line): line is LineWithInputs => line !== undefined)
    .map(mapLineToResponse);

  const updatedLines = updatedLineIds
    .map((id) => lineMap.get(id.toString()))
    .filter((line): line is LineWithInputs => line !== undefined)
    .map(mapLineToResponse);

  return {
    success: true,
    data: {
      created: createdLines,
      updated: updatedLines,
      deleted: deletedLineIds,
    },
  };
};
