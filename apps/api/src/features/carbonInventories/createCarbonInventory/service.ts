import { type PrismaClient } from "@repo/database";
import {
  type CreateCarbonInventoryRequest,
  type CreateCarbonInventoryResponse,
  MethodologyVersionStatus,
  User,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { NoActiveMethodologyError } from "../errors.js";

export const createCarbonInventoryService = async (
  prismaClient: PrismaClient,
  data: CreateCarbonInventoryRequest,
  user?: User | null
): Promise<CreateCarbonInventoryResponse> => {
  // Find the first methodology version with status MethodologyVersionStatus.PUBLISHED
  const availableMethodology = await prismaClient.methodologyVersion.findFirst({
    where: {
      status: MethodologyVersionStatus.PUBLISHED,
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!availableMethodology) {
    throw new NoActiveMethodologyError();
  }

  // TODO: we should associate the new inventory to the right organization instead of just taking the first one, but since we don't have the organization management and user-organization association implemented yet, we'll just take the first organization for now. --- IGNORE ---
  const organization = await prismaClient.organization.findFirst({
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
    },
  });

  const userId = user?.id ?? null;

  const item = await prismaClient.carbonInventory.create({
    data: {
      usageMode: data.usageMode,
      methodologyVersionId: availableMethodology.id,
      organizationId: organization?.id ?? null,
      createdById: userId ? BigInt(userId) : null,
      updatedAt: null,
    },
  });

  return mapCarbonInventoryToResponse(item);
};
