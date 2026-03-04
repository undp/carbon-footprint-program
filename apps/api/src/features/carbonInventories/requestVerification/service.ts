import { SubmissionType, type PrismaClient } from "@repo/database";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  validateOrganizationIsAccredited,
  createCarbonInventorySubmission,
  CarbonInventoryWithSubmissions,
} from "../helpers.js";
import { canSubmitToVerification } from "./helpers.js";

export const requestVerificationService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string,
  userId?: string | null
): Promise<void> => {
  const inventory: CarbonInventoryWithSubmissions =
    await prismaClient.carbonInventory.findUnique({
      where: { id: BigInt(carbonInventoryId) },
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

  validateOrganizationIsAccredited(
    carbonInventoryId,
    inventory.organizationId,
    inventory.organization?.summary?.isAccredited
  );

  canSubmitToVerification(inventory);

  const createdById = userId ? BigInt(userId) : null;

  await createCarbonInventorySubmission(
    prismaClient,
    inventory.id,
    SubmissionType.CARBON_INVENTORY_VERIFICATION,
    createdById
  );
};
