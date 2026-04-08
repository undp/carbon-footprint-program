import {
  BadgeStatus,
  InventoryStatus,
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import {
  type User,
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
} from "@repo/types";
import { canSelfDeclare } from "@repo/utils";
import {
  CarbonInventoryCannotSelfDeclareError,
  CarbonInventoryNotFoundForSelfDeclareError,
  CarbonInventoryNotActiveForSelfDeclareError,
  CarbonInventoryAlreadySelfDeclaredError,
  CarbonInventoryMissingOrganizationError,
  CarbonInventoryMissingYearError,
  CarbonInventoryNotDraftForSelfDeclareError,
  CarbonInventoryYearAlreadySelfDeclaredError,
} from "./errors.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
  createCarbonInventorySubmission,
} from "../helpers.js";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";

export const selfDeclareCarbonInventoryService = async (
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
      data: {
        isSelfDeclared: true,
        selfDeclaredAt: new Date(),
        updatedById: createdById,
      },
    });

    // Single query for both diagnostics and happy-path logic.
    // Includes submissions (for display status) plus fields needed for error diagnosis.
    const inventory = await tx.carbonInventory.findUnique({
      where: { id: inventoryId },
      select: {
        ...carbonInventoryWithSubmissionsMinimalSelect,
        status: true,
        organizationId: true,
        year: true,
      },
    });

    if (!inventory) {
      throw new CarbonInventoryNotFoundForSelfDeclareError(carbonInventoryId);
    }

    if (count === 0) {
      // Diagnose which precondition failed to provide a specific error.
      if (inventory.status !== InventoryStatus.ACTIVE) {
        throw new CarbonInventoryNotActiveForSelfDeclareError(
          carbonInventoryId
        );
      }
      if (inventory.isSelfDeclared) {
        throw new CarbonInventoryAlreadySelfDeclaredError(carbonInventoryId);
      }
      if (!inventory.organizationId) {
        throw new CarbonInventoryMissingOrganizationError(carbonInventoryId);
      }
      if (!inventory.year) {
        throw new CarbonInventoryMissingYearError(carbonInventoryId);
      }

      // All conditions looked fine — a concurrent request likely claimed it first.
      throw new CarbonInventoryCannotSelfDeclareError(carbonInventoryId);
    }

    const displayStatus = calculateDisplayStatus({
      ...inventory,
      isSelfDeclared: false,
    });

    if (!canSelfDeclare(displayStatus)) {
      throw new CarbonInventoryNotDraftForSelfDeclareError(carbonInventoryId);
    }

    // Ensure no other inventory for the same organization+year is already self-declared.
    if (inventory.organizationId && inventory.year) {
      const existingSelfDeclared = await tx.carbonInventory.findFirst({
        where: {
          id: { not: inventoryId },
          organizationId: inventory.organizationId,
          year: inventory.year,
          status: InventoryStatus.ACTIVE,
          isSelfDeclared: true,
        },
        select: { id: true },
      });

      if (existingSelfDeclared) {
        throw new CarbonInventoryYearAlreadySelfDeclaredError(
          String(inventory.year)
        );
      }
    }

    const recognitionBehavior = await getSystemParameterValue(
      tx,
      SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR
    );

    if (recognitionBehavior !== MeasurementRecognitionBehaviorEnum.AUTOMATIC)
      return;

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
        status: SubmissionStatus.APPROVED_AUTOMATICALLY,
        badgeId: activeBadge?.id,
        reviewerId: createdById,
        updatedById: createdById,
        reviewedAt: new Date(),
      },
    });
  });
};
