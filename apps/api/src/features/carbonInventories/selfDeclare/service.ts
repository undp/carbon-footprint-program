import {
  BadgeStatus,
  InventoryStatus,
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { User } from "@repo/types";
import { CarbonInventoryCannotSelfDeclareError } from "../errors.js";
import {
  carbonInventoryWithSubmissionsMinimalSelect,
  createCarbonInventorySubmission,
} from "../helpers.js";

export const selfDeclareService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string,
  user: User | null
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const inventoryId = BigInt(carbonInventoryId);
    const createdById = user ? BigInt(user.id) : null;

    // Atomically claim the inventory row for self-declaration.
    // The isSelfDeclared: false predicate prevents concurrent requests
    // from both succeeding.
    const { count } = await tx.carbonInventory.updateMany({
      where: {
        id: inventoryId,
        status: InventoryStatus.ACTIVE,
        isSelfDeclared: false,
        organizationId: { not: null },
        year: { not: null },
      },
      data: { isSelfDeclared: true, updatedById: createdById },
    });

    if (count === 0) {
      throw new CarbonInventoryCannotSelfDeclareError(carbonInventoryId);
    }

    // Verify no submissions exist that would make the display status non-DRAFT.
    // updateMany cannot filter on relations, so we check after claiming the row.
    // If this check fails, the transaction rolls back the claim above.
    const inventory = await tx.carbonInventory.findFirst({
      where: { id: inventoryId },
      select: carbonInventoryWithSubmissionsMinimalSelect,
    });

    if (inventory) {
      const submissions =
        inventory.submission?.subject.submissions || [];
      if (submissions.length > 0) {
        throw new CarbonInventoryCannotSelfDeclareError(carbonInventoryId);
      }
    }

    // Check recognition behavior
    const recognitionBehavior = await tx.systemParameter.findUnique({
      where: { key: "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR" },
      select: { value: true },
    });

    if (recognitionBehavior?.value !== "AUTOMATIC") return;

    // Create submission and auto-approve it
    const submissionId = await createCarbonInventorySubmission(
      tx,
      inventoryId,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      createdById
    );

    const activeBadge = await tx.badge.findFirst({
      where: {
        type: SubmissionType.CARBON_INVENTORY_CALCULATION,
        status: BadgeStatus.ACTIVE,
      },
      select: { id: true },
    });

    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.APPROVED,
        badgeId: activeBadge?.id,
        reviewerId: createdById,
        updatedById: createdById,
      },
    });
  });
};
