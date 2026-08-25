import type { PrismaClient } from "@repo/database";
import {
  type SyncCarbonInventoryLinesRequest,
  type SyncCarbonInventoryLinesResponse,
  CarbonInventoryLineStatus,
  FileStatus,
  User,
} from "@repo/types";
import { mapLineToResponse, type LineWithInputs } from "../mappers.js";
import {
  createLineInput,
  createLineFactor,
  createLineResult,
  linkFilesToCarbonInventoryLine,
  unlinkFilesFromCarbonInventoryLine,
} from "./helper.js";
import {
  CarbonInventoryNotFoundError,
  SubcategoryNotFoundError,
  SubcategoryNotInMethodologyError,
  LineNotFoundError,
  LineNotInCarbonInventoryError,
} from "../errors.js";
import {
  carbonInventoryWithSubmissionsMinimalSelect,
  validateCarbonInventoryIsEditable,
} from "../helpers.js";

export const syncCarbonInventoryLinesService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  request: SyncCarbonInventoryLinesRequest,
  user: User | null
): Promise<SyncCarbonInventoryLinesResponse> => {
  // Fetch inventory with submission data for validation + fields for business logic
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: { id: carbonInventoryId },
    select: {
      methodologyVersionId: true,
      ...carbonInventoryWithSubmissionsMinimalSelect,
    },
  });

  if (!carbonInventory)
    throw new CarbonInventoryNotFoundError(carbonInventoryId);

  validateCarbonInventoryIsEditable(carbonInventory);

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
      if (!subcategory) throw new SubcategoryNotFoundError();
      if (
        subcategory.category.methodologyVersionId !==
        carbonInventory.methodologyVersionId
      )
        throw new SubcategoryNotInMethodologyError();
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
      if (!line) throw new LineNotFoundError(item.id);
      if (line.carbonInventoryId !== carbonInventoryId)
        throw new LineNotInCarbonInventoryError(
          item.id,
          carbonInventoryId.toString(),
          line.carbonInventoryId.toString()
        );
    }
  }

  // Execute all operations in a transaction
  const createdLineIds: bigint[] = [];
  const updatedLineIds: bigint[] = [];
  const deletedLineIds: string[] = [];

  const userId = user ? BigInt(user.id) : null;

  await prismaClient.$transaction(async (tx) => {
    // 1. CREATE operations
    for (const createItem of request.create) {
      const line = await tx.carbonInventoryLine.create({
        data: {
          carbonInventoryId,
          subcategoryId: BigInt(createItem.subcategoryId),
          status: CarbonInventoryLineStatus.ACTIVE,
          createdById: userId,
          updatedAt: null,
        },
      });

      createdLineIds.push(line.id);

      // Always create input with the provided inputType
      const inputType = createItem.inputType;
      const newInput = await createLineInput(
        tx,
        line.id,
        createItem,
        inputType,
        userId
      );
      await createLineFactor(tx, newInput.id, createItem, userId);
      await createLineResult(tx, newInput.id, createItem, inputType, userId);

      if (createItem.addFileUuids.length > 0) {
        await linkFilesToCarbonInventoryLine(
          tx,
          line.id,
          createItem.addFileUuids,
          userId,
          carbonInventoryId
        );
      }
    }

    // 2. UPDATE operations
    for (const updateItem of request.update) {
      const lineId = BigInt(updateItem.id);
      updatedLineIds.push(lineId);

      // Mark old active input as inactive
      await tx.carbonInventoryLineInput.updateMany({
        where: { lineId, isActive: true },
        data: { isActive: false, updatedById: userId },
      });

      const inputType = updateItem.inputType;
      const newInput = await createLineInput(
        tx,
        lineId,
        updateItem,
        inputType,
        userId
      );
      await createLineFactor(tx, newInput.id, updateItem, userId);
      await createLineResult(tx, newInput.id, updateItem, inputType, userId);

      if (updateItem.addFileUuids.length > 0) {
        await linkFilesToCarbonInventoryLine(
          tx,
          lineId,
          updateItem.addFileUuids,
          userId,
          carbonInventoryId
        );
      }
      if (updateItem.removeFileIds.length > 0) {
        await unlinkFilesFromCarbonInventoryLine(
          tx,
          lineId,
          updateItem.removeFileIds
        );
      }
    }

    // 3. DELETE operations (soft delete)
    for (const deleteItem of request.delete) {
      await tx.carbonInventoryLine.update({
        where: { id: BigInt(deleteItem.id) },
        data: {
          status: CarbonInventoryLineStatus.DELETED,
          updatedById: userId,
        },
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
        files: {
          where: { file: { status: FileStatus.ACTIVE } },
          include: {
            file: {
              select: {
                id: true,
                uuid: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
                status: true,
              },
            },
          },
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
    created: createdLines,
    updated: updatedLines,
    deleted: deletedLineIds,
  };
};
