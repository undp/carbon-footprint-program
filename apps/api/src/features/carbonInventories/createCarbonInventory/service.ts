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
  // Find the first methodology version with status MethodologyVersionStatus.ACTIVE
  const availableMethodology = await prismaClient.methodologyVersion.findFirst({
    where: {
      status: MethodologyVersionStatus.ACTIVE,
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

  const userId = user?.id ?? null;

  const item = await prismaClient.carbonInventory.create({
    data: {
      usageMode: data.usageMode,
      methodologyVersionId: availableMethodology.id,
      createdById: userId ? BigInt(userId) : null,
      updatedById: userId ? BigInt(userId) : null,
    },
  });

  return mapCarbonInventoryToResponse(item);
};
