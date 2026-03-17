import {
  BadgeStatus,
  InventoryStatus,
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import type { User } from "@repo/types";
import {
  CarbonInventoryCannotSelfDeclareError,
  CarbonInventoryNotFoundError,
  OrganizationNotAssociatedError,
} from "../errors.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
  createCarbonInventorySubmission,
} from "../helpers.js";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";

export const selfDeclareService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string,
  user: User | null
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const inventory = await tx.carbonInventory.findFirst({
      where: { id: BigInt(carbonInventoryId), status: InventoryStatus.ACTIVE },
      select: {
        organizationId: true,
        ...carbonInventoryWithSubmissionsMinimalSelect,
      },
    });

    if (!inventory) throw new CarbonInventoryNotFoundError(carbonInventoryId);

    if (!inventory.organizationId) {
      throw new OrganizationNotAssociatedError(carbonInventoryId);
    }

    const displayStatus = calculateDisplayStatus(inventory);
    if (displayStatus !== CarbonInventoryDisplayStatusEnum.DRAFT) {
      throw new CarbonInventoryCannotSelfDeclareError(carbonInventoryId);
    }

    const createdById = user ? BigInt(user.id) : null;

    // Set isSelfDeclared = true
    await tx.carbonInventory.update({
      where: { id: inventory.id },
      data: { isSelfDeclared: true },
    });

    // Check if measurement submissions are enabled
    const measurementEnabled = await tx.systemParameter.findUnique({
      where: { key: "CARBON_INVENTORIES_MEASUREMENT_ENABLED" },
      select: { value: true },
    });

    if (measurementEnabled?.value !== "true") return;

    // Check if auto-recognition is enabled
    const autoRecognition = await tx.systemParameter.findUnique({
      where: {
        key: "CARBON_INVENTORIES_MEASUREMENT_SELF_DECLARATION_AUTO_RECOGNITION",
      },
      select: { value: true },
    });

    if (autoRecognition?.value !== "true") return;

    // Create submission and auto-approve it
    const submissionId = await createCarbonInventorySubmission(
      tx,
      inventory.id,
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
