import type { PrismaClient } from "@repo/database";
import {
  type SyncCarbonInventoryLinesRequest,
  type SyncCarbonInventoryLinesResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import { mapLineToResponse, type LineWithInputs } from "../mappers.js";
import {
  createLineInput,
  createLineFactor,
  createLineResult,
} from "./syncCarbonInventoryLinesHelper.js";

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
        status: CarbonInventoryLineStatus.ACTIVE, // Only consider active lines
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
          status: CarbonInventoryLineStatus.ACTIVE,
          createdById: null,
          updatedById: null,
        },
      });

      createdLineIds.push(line.id);

      // Always create input with the provided inputType
      const inputType = createItem.inputType;
      const newInput = await createLineInput(
        tx,
        line.id,
        createItem,
        inputType
      );
      await createLineFactor(tx, newInput.id, createItem);
      await createLineResult(tx, newInput.id, createItem, inputType);
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

      const inputType = updateItem.inputType;
      const newInput = await createLineInput(tx, lineId, updateItem, inputType);
      await createLineFactor(tx, newInput.id, updateItem);
      await createLineResult(tx, newInput.id, updateItem, inputType);
    }

    // 3. DELETE operations (soft delete)
    for (const deleteItem of request.delete) {
      await tx.carbonInventoryLine.update({
        where: { id: BigInt(deleteItem.id) },
        data: { status: CarbonInventoryLineStatus.DELETED, updatedById: null },
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
