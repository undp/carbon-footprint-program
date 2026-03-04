import { SubmissionType, type PrismaClient } from "@repo/database";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  validateOrganizationIsAccredited,
  createCarbonInventorySubmission,
} from "../helpers.js";
import { validateNoExistingCalculationSubmission } from "./helpers.js";

export const requestCalculationService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string,
  userId?: string | null
): Promise<void> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
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
    },
  });

  if (!inventory) throw new CarbonInventoryNotFoundError(carbonInventoryId);

  // TODO: Validate the carbon inventory does not have an APPROVED or REJECTED submission of type CALCULATION
  validateNoExistingCalculationSubmission();

  validateOrganizationIsAccredited(
    carbonInventoryId,
    inventory.organizationId,
    inventory.organization?.summary?.isAccredited
  );

  const createdById = userId ? BigInt(userId) : null;

  await createCarbonInventorySubmission(
    prismaClient,
    inventory.id,
    SubmissionType.CARBON_INVENTORY_CALCULATION,
    createdById
  );
};
