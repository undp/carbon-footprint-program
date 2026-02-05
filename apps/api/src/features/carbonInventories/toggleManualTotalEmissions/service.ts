import type { Prisma, PrismaClient } from "@repo/database";
import { CarbonInventoryLineStatus } from "@repo/types";
import { cleanupDirectLines } from "./helper.js";

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

  // 3. Fetch lines for the subcategory in this inventory
  const lines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId,
      subcategoryId,
      status: { not: CarbonInventoryLineStatus.DELETED },
    },
    include: {
      inputs: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  // Identify lines
  const activeLines = lines.filter(
    ({ status }) => status === CarbonInventoryLineStatus.ACTIVE
  );
  const directActiveLine = activeLines.find(
    (l) => l.inputs[0]?.inputType === "DIRECT"
  );
  const nonDirectActiveLinesIds = activeLines
    .filter((l) => l.inputs[0]?.inputType !== "DIRECT")
    .map((l) => l.id);

  const outdatedLines = lines.filter(
    ({ status }) => status === CarbonInventoryLineStatus.OUTDATED
  );
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
      const directLine = await cleanupDirectLines(tx, lines);

      // 2. Mark all non-DIRECT ACTIVE lines as OUTDATED
      if (nonDirectActiveLinesIds.length > 0) {
        await tx.carbonInventoryLine.updateMany({
          where: { id: { in: nonDirectActiveLinesIds } },
          data: { status: CarbonInventoryLineStatus.OUTDATED },
        });
      }

      // 3. Handle DIRECT line
      if (directLine) {
        await tx.carbonInventoryLine.update({
          where: { id: directLine.id },
          data: { status: CarbonInventoryLineStatus.ACTIVE },
        });
      } else {
        // Create new DIRECT line
        const newLine = await tx.carbonInventoryLine.create({
          data: {
            carbonInventoryId,
            subcategoryId,
            status: CarbonInventoryLineStatus.ACTIVE,
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
      await cleanupDirectLines(tx, lines);

      // 2. Mark DIRECT line as OUTDATED
      await tx.carbonInventoryLine.update({
        where: { id: directActiveLine.id },
        data: { status: CarbonInventoryLineStatus.OUTDATED },
      });

      // 3. Mark all non-DIRECT OUTDATED lines as ACTIVE
      await tx.carbonInventoryLine.updateMany({
        where: { id: { in: nonDirectOutdatedLinesIds } },
        data: { status: CarbonInventoryLineStatus.ACTIVE },
      });
    });
  }

  return { success: true };
};
