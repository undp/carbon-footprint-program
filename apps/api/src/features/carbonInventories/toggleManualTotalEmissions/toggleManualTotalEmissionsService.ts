import type { Prisma, PrismaClient } from "@repo/database";
import { cleanupDirectLines } from "./toggleManualTotalEmissionsHelper.js";

export type ToggleManualTotalEmissionsResult =
  | { success: true }
  | {
      success: false;
      error:
        | "CARBON_INVENTORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_FOUND"
        | "SUBCATEGORY_NOT_IN_METHODOLOGY"
        | "NO_ACTIVE_LINES_TO_CONVERT"
        | "MANUAL_MODE_ALREADY_ACTIVE"
        | "MANUAL_MODE_NOT_ACTIVE"
        | "NO_LINES_TO_RESTORE";
    };

export const toggleManualTotalEmissionsService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryId: bigint,
  activated: boolean
): Promise<ToggleManualTotalEmissionsResult> => {
  // 1. Validate carbon inventory exists
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: { id: carbonInventoryId },
    select: { id: true, methodologyVersionId: true },
  });

  if (!carbonInventory) {
    return { success: false, error: "CARBON_INVENTORY_NOT_FOUND" };
  }

  // 2. Validate subcategory exists and belongs to the inventory methodology
  const subcategory = await prismaClient.subcategory.findUnique({
    where: { id: subcategoryId },
    include: {
      category: {
        select: { methodologyVersionId: true },
      },
    },
  });

  if (!subcategory) {
    return { success: false, error: "SUBCATEGORY_NOT_FOUND" };
  }

  if (
    subcategory.category.methodologyVersionId !==
    carbonInventory.methodologyVersionId
  ) {
    return { success: false, error: "SUBCATEGORY_NOT_IN_METHODOLOGY" };
  }

  // 3. Get Status IDs
  const statuses = await prismaClient.statusCatalog.findMany({
    where: {
      scope: "ENTITY",
      code: { in: ["ACTIVE", "OUTDATED", "DELETED"] },
    },
    select: { id: true, code: true },
  });

  const activeStatusId = statuses.find((s) => s.code === "ACTIVE")?.id;
  const outdatedStatusId = statuses.find((s) => s.code === "OUTDATED")?.id;
  const deletedStatusId = statuses.find((s) => s.code === "DELETED")?.id;

  if (!activeStatusId || !outdatedStatusId || !deletedStatusId) {
    throw new Error(
      "Required statuses (ACTIVE, OUTDATED, DELETED) not found in database"
    );
  }

  // 4. Fetch lines for the subcategory in this inventory
  const lines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId,
      subcategoryId,
      statusId: { not: deletedStatusId },
    },
    include: {
      inputs: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  // Identify lines
  const activeLines = lines.filter((l) => l.statusId === activeStatusId);
  const directActiveLine = activeLines.find(
    (l) => l.inputs[0]?.inputType === "DIRECT"
  );
  const nonDirectActiveLinesIds = activeLines
    .filter((l) => l.inputs[0]?.inputType !== "DIRECT")
    .map((l) => l.id);

  const outdatedLines = lines.filter((l) => l.statusId === outdatedStatusId);
  const nonDirectOutdatedLinesIds = outdatedLines
    .filter((l) => l.inputs[0]?.inputType !== "DIRECT")
    .map((l) => l.id);

  if (activated) {
    // Caso 1: activated: true (Activar modo manual)
    if (activeLines.length === 0) {
      return { success: false, error: "NO_ACTIVE_LINES_TO_CONVERT" };
    }

    if (directActiveLine) {
      return { success: false, error: "MANUAL_MODE_ALREADY_ACTIVE" };
    }

    await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Cleanup duplicates
      const directLine = await cleanupDirectLines(tx, lines, deletedStatusId);

      // 2. Mark all non-DIRECT ACTIVE lines as OUTDATED
      if (nonDirectActiveLinesIds.length > 0) {
        await tx.carbonInventoryLine.updateMany({
          where: { id: { in: nonDirectActiveLinesIds } },
          data: { statusId: outdatedStatusId },
        });
      }

      // 3. Handle DIRECT line
      if (directLine) {
        await tx.carbonInventoryLine.update({
          where: { id: directLine.id },
          data: { statusId: activeStatusId },
        });
      } else {
        // Create new DIRECT line
        const newLine = await tx.carbonInventoryLine.create({
          data: {
            carbonInventoryId,
            subcategoryId,
            statusId: activeStatusId,
          },
        });
        await tx.carbonInventoryLineInput.create({
          data: {
            lineId: newLine.id,
            inputType: "DIRECT",
            isActive: true,
            directTotalEmissions: null,
          },
        });
      }
    });
  } else {
    // Caso 2: activated: false
    if (!directActiveLine) {
      return { success: false, error: "MANUAL_MODE_NOT_ACTIVE" };
    }

    // TODO: remove this error when no-lines subcategory is supported
    if (nonDirectOutdatedLinesIds.length === 0) {
      return { success: false, error: "NO_LINES_TO_RESTORE" };
    }

    await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Cleanup duplicates (though directActiveLine should be unique if logic is followed)
      await cleanupDirectLines(tx, lines, deletedStatusId);

      // 2. Mark DIRECT line as OUTDATED
      await tx.carbonInventoryLine.update({
        where: { id: directActiveLine.id },
        data: { statusId: outdatedStatusId },
      });

      // 3. Mark all non-DIRECT OUTDATED lines as ACTIVE
      await tx.carbonInventoryLine.updateMany({
        where: { id: { in: nonDirectOutdatedLinesIds } },
        data: { statusId: activeStatusId },
      });
    });
  }

  return { success: true };
};
