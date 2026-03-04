import { SubmissionType, type PrismaClient } from "@repo/database";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  validateOrganizationIsAccredited,
  validateNoExistingVerificationSubmission,
} from "./helpers.js";

export const requestVerificationService = async (
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

  // TODO: Validate the carbon inventory does not have an APPROVED or REJECTED submission of type VERIFICATION
  validateNoExistingVerificationSubmission();

  validateOrganizationIsAccredited(
    carbonInventoryId,
    inventory.organizationId,
    inventory.organization?.summary?.isAccredited
  );

  const createdById = userId ? BigInt(userId) : null;

  const existingSubject =
    await prismaClient.submissionSubjectCarbonInventory.findUnique({
      where: { carbonInventoryId: inventory.id },
      select: { subjectId: true },
    });

  if (existingSubject) {
    await prismaClient.submission.create({
      data: {
        subjectId: existingSubject.subjectId,
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        createdById,
        updatedAt: null,
      },
    });
  } else {
    await prismaClient.submissionSubject.create({
      data: {
        createdById,
        submissions: {
          create: {
            type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
            createdById,
            updatedAt: null,
          },
        },
        carbonInventory: {
          create: {
            carbonInventoryId: inventory.id,
          },
        },
      },
    });
  }
};
