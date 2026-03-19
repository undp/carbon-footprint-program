import {
  BadgeStatus,
  InventoryStatus,
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { User } from "@repo/types";
import { canSelfDeclare } from "@repo/utils";
import { CarbonInventoryCannotSelfDeclareError } from "./errors.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
  createCarbonInventorySubmission,
} from "../helpers.js";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";

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

    // Verify the display status was DRAFT before the claim.
    // updateMany cannot filter on relations, so we check after claiming.
    // We override isSelfDeclared to false to evaluate the pre-claim state.
    // If this check fails, the transaction rolls back the claim above.
    const inventory = await tx.carbonInventory.findFirst({
      where: { id: inventoryId },
      select: carbonInventoryWithSubmissionsMinimalSelect,
    });

    if (!inventory) {
      throw new CarbonInventoryCannotSelfDeclareError(carbonInventoryId);
    }

    const displayStatus = calculateDisplayStatus({
      ...inventory,
      isSelfDeclared: false,
    });

    if (!canSelfDeclare(displayStatus)) {
      throw new CarbonInventoryCannotSelfDeclareError(carbonInventoryId);
    }

    const recognitionBehavior = await getSystemParameterValue(
      tx,
      "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR"
    );

    if (recognitionBehavior !== "AUTOMATIC") return;

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
