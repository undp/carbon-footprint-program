import type { Prisma, PrismaClient } from "@repo/database";
import { CarbonInventoryLineStatus, User } from "@repo/types";
import { cleanupDirectLines } from "./helper.js";
import createError from "@fastify/error";
import {
  CarbonInventoryNotFoundError,
  SubcategoryNotFoundError,
  SubcategoryNotInMethodologyError,
} from "../errors.js";

const NoActiveLinesToConvertError = createError(
  "NO_ACTIVE_LINES_TO_CONVERT",
  "There are no active lines in this subcategory to convert to manual mode",
  422
);

const ManualModeAlreadyActiveError = createError(
  "MANUAL_MODE_ALREADY_ACTIVE",
  "Manual mode is already active for this subcategory",
  422
);

const ManualModeNotActiveError = createError(
  "MANUAL_MODE_NOT_ACTIVE",
  "Manual mode is not active for this subcategory",
  422
);

const NoLinesToRestoreError = createError(
  "NO_LINES_TO_RESTORE",
  "There are no previous lines to restore for this subcategory",
  422
);

export const toggleManualTotalEmissionsService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: bigint,
  subcategoryId: bigint,
  activated: boolean,
  user: User | null
): Promise<void> => {
  // 1. Validate carbon inventory exists
  const carbonInventory = await prismaClient.carbonInventory.findUnique({
    where: { id: carbonInventoryId },
    select: { id: true, methodologyVersionId: true },
  });

  if (!carbonInventory)
    throw new CarbonInventoryNotFoundError(carbonInventoryId);

  // 2. Validate subcategory exists and belongs to the inventory methodology
  const subcategory = await prismaClient.subcategory.findUnique({
    where: { id: subcategoryId },
    include: {
      category: {
        select: { methodologyVersionId: true },
      },
    },
  });

  if (!subcategory) throw new SubcategoryNotFoundError();

  if (
    subcategory.category.methodologyVersionId !==
    carbonInventory.methodologyVersionId
  )
    throw new SubcategoryNotInMethodologyError();

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

  const userId = user ? BigInt(user.id) : null;

  if (activated) {
    // Caso 1: activated: true (Activar modo manual)
    if (activeLines.length === 0) throw new NoActiveLinesToConvertError();

    if (directActiveLine) throw new ManualModeAlreadyActiveError();

    await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Cleanup duplicates
      const directLine = await cleanupDirectLines(tx, lines, userId);

      // 2. Mark all non-DIRECT ACTIVE lines as OUTDATED
      if (nonDirectActiveLinesIds.length > 0) {
        await tx.carbonInventoryLine.updateMany({
          where: { id: { in: nonDirectActiveLinesIds } },
          data: {
            status: CarbonInventoryLineStatus.OUTDATED,
            updatedById: userId,
          },
        });
      }

      // 3. Handle DIRECT line
      if (directLine) {
        await tx.carbonInventoryLine.update({
          where: { id: directLine.id },
          data: {
            status: CarbonInventoryLineStatus.ACTIVE,
            updatedById: userId,
          },
        });
      } else {
        // Create new DIRECT line
        const newLine = await tx.carbonInventoryLine.create({
          data: {
            carbonInventoryId,
            subcategoryId,
            status: CarbonInventoryLineStatus.ACTIVE,
            createdById: userId,
          },
        });
        await tx.carbonInventoryLineInput.create({
          data: {
            lineId: newLine.id,
            inputType: "DIRECT",
            isActive: true,
            directTotalEmissions: null,
            createdById: userId,
          },
        });
      }
    });
  } else {
    // Caso 2: activated: false
    if (!directActiveLine) throw new ManualModeNotActiveError();

    // TODO: remove this error when no-lines subcategory is supported
    if (nonDirectOutdatedLinesIds.length === 0)
      throw new NoLinesToRestoreError();

    await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Cleanup duplicates (though directActiveLine should be unique if logic is followed)
      await cleanupDirectLines(tx, lines, userId);

      // 2. Mark DIRECT line as OUTDATED
      await tx.carbonInventoryLine.update({
        where: { id: directActiveLine.id },
        data: {
          status: CarbonInventoryLineStatus.OUTDATED,
          updatedById: userId,
        },
      });

      // 3. Mark all non-DIRECT OUTDATED lines as ACTIVE
      await tx.carbonInventoryLine.updateMany({
        where: { id: { in: nonDirectOutdatedLinesIds } },
        data: { status: CarbonInventoryLineStatus.ACTIVE, updatedById: userId },
      });
    });
  }
};
