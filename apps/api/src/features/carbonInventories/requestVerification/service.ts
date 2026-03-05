import {
  InventoryStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import {
  CarbonInventoryCannotRequestVerificationError,
  CarbonInventoryNotFoundError,
  OrganizationNotAccreditedError,
  OrganizationNotAssociatedError,
} from "../errors.js";
import { createCarbonInventorySubmission } from "../helpers.js";
import { canSubmitToVerification } from "./helpers.js";

export const requestVerificationService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string,
  userId?: string | null
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const inventory = await tx.carbonInventory.findFirst({
      where: { id: BigInt(carbonInventoryId), status: InventoryStatus.ACTIVE },
      select: {
        id: true,
        organizationId: true,
        organization: {
          select: {
            summary: {
              select: { isAccredited: true },
            },
          },
        },
        submission: {
          include: {
            subject: {
              include: {
                submissions: {
                  select: {
                    id: true,
                    status: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inventory) throw new CarbonInventoryNotFoundError(carbonInventoryId);

    if (!inventory.organizationId) {
      throw new OrganizationNotAssociatedError(carbonInventoryId);
    }

    if (!inventory.organization?.summary?.isAccredited) {
      throw new OrganizationNotAccreditedError(carbonInventoryId);
    }

    const can = canSubmitToVerification(inventory);
    if (!can)
      throw new CarbonInventoryCannotRequestVerificationError(inventory.id);

    const createdById = userId ? BigInt(userId) : null;

    await createCarbonInventorySubmission(
      tx,
      inventory.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      createdById
    );
  });
};
